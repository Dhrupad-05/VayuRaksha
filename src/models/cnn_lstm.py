"""PyTorch CNN-LSTM AQI model with dual uncertainty heads."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import r2_score
from torch import nn
from torch.utils.data import DataLoader, Dataset

from src.data_pipeline.features import CNN_SPATIAL_CHANNELS


class DepthwiseSeparableConv(nn.Module):
    """Depthwise separable 2D convolution block."""

    def __init__(self, in_channels: int, out_channels: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, in_channels, kernel_size=3, padding=1, groups=in_channels),
            nn.BatchNorm2d(in_channels),
            nn.SiLU(),
            nn.Conv2d(in_channels, out_channels, kernel_size=1),
            nn.BatchNorm2d(out_channels),
            nn.SiLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
        )

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        """Encode a spatial feature patch."""
        return self.block(tensor)


class SqueezeExcitation(nn.Module):
    """Channel attention block."""

    def __init__(self, channels: int, reduction: int = 8) -> None:
        super().__init__()
        hidden = max(4, channels // reduction)
        self.fc = nn.Sequential(
            nn.Linear(channels, hidden),
            nn.SiLU(),
            nn.Linear(hidden, channels),
            nn.Sigmoid(),
        )

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        """Scale channels by learned global context."""
        batch, channels, _, _ = tensor.shape
        pooled = tensor.mean(dim=(2, 3))
        weights = self.fc(pooled).view(batch, channels, 1, 1)
        return tensor * weights


class CNNLSTMAQIModel(nn.Module):
    """CNN-LSTM with attention and dual mean/sigma heads."""

    def __init__(self, channels: int = 13, lat_bins: int = 100, lon_bins: int = 200) -> None:
        super().__init__()
        self.conv1 = DepthwiseSeparableConv(channels, 32)
        self.se1 = SqueezeExcitation(32)
        self.conv2 = DepthwiseSeparableConv(32, 64)
        self.se2 = SqueezeExcitation(64)
        self.conv3 = DepthwiseSeparableConv(64, 128)
        self.lstm = nn.LSTM(
            input_size=128,
            hidden_size=128,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.3,
        )
        self.attention = nn.MultiheadAttention(256, 8, dropout=0.2, batch_first=True)
        self.lat_embed = nn.Embedding(lat_bins, 32)
        self.lon_embed = nn.Embedding(lon_bins, 32)
        self.decoder = nn.Sequential(
            nn.Linear(256 + 64, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
        )
        self.aqi_head = nn.Linear(128, 1)
        self.sigma_head = nn.Sequential(nn.Linear(128, 64), nn.ReLU(), nn.Linear(64, 1), nn.Softplus())

    def forward(
        self, spatial_seq: torch.Tensor, lat_index: torch.Tensor, lon_index: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Predict normalized AQI mean and positive sigma."""
        batch, timesteps = spatial_seq.shape[:2]
        encoded = []
        for idx in range(timesteps):
            x = self.conv1(spatial_seq[:, idx])
            x = self.se1(x)
            x = self.conv2(x)
            x = self.se2(x)
            x = self.conv3(x)
            encoded.append(x.view(batch, -1))
        spatial_encoded = torch.stack(encoded, dim=1)
        lstm_out, _ = self.lstm(spatial_encoded)
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        loc_emb = torch.cat([self.lat_embed(lat_index), self.lon_embed(lon_index)], dim=1)
        decoded = self.decoder(torch.cat([attn_out.mean(dim=1), loc_emb], dim=1))
        mean = self.aqi_head(decoded).squeeze(-1)
        sigma = self.sigma_head(decoded).squeeze(-1).clamp_min(0.03)
        return mean, sigma


def gaussian_nll_loss(prediction: torch.Tensor, sigma: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Gaussian negative log-likelihood loss."""
    return (torch.log(sigma) + ((target - prediction) ** 2) / (2 * sigma**2)).mean()


class AQISequenceDataset(Dataset):
    """Lag-safe 30-day sequence dataset for CNN-LSTM training."""

    def __init__(
        self,
        frame: pd.DataFrame,
        sequence_length: int,
        target_mean: float,
        target_std: float,
        max_sequences: int | None = None,
        seed: int = 42,
    ) -> None:
        self.sequence_length = sequence_length
        self.target_mean = target_mean
        self.target_std = target_std
        self.samples: list[tuple[np.ndarray, int, int, float, int]] = []
        self.row_indices: list[int] = []
        rng = np.random.default_rng(seed)
        for (_, _), group in frame.sort_values("date").groupby(["lat", "lon"], sort=False):
            if len(group) < sequence_length:
                continue
            values = group[CNN_SPATIAL_CHANNELS].to_numpy(dtype=np.float32)
            targets = group["aqi"].to_numpy(dtype=np.float32)
            lats = group["lat"].to_numpy(dtype=np.float32)
            lons = group["lon"].to_numpy(dtype=np.float32)
            indexes = np.arange(sequence_length - 1, len(group))
            if max_sequences:
                rng.shuffle(indexes)
                indexes = indexes[: max(1, max_sequences // max(1, frame[["lat", "lon"]].drop_duplicates().shape[0]))]
            for idx in indexes:
                seq = values[idx - sequence_length + 1 : idx + 1]
                row_index = int(group.index[idx])
                self.samples.append(
                    (
                        seq,
                        _lat_to_index(float(lats[idx])),
                        _lon_to_index(float(lons[idx])),
                        float((targets[idx] - target_mean) / target_std),
                        row_index,
                    )
                )
                self.row_indices.append(row_index)
        if max_sequences and len(self.samples) > max_sequences:
            chosen = rng.choice(len(self.samples), size=max_sequences, replace=False)
            self.samples = [self.samples[int(i)] for i in chosen]
            self.row_indices = [self.row_indices[int(i)] for i in chosen]

    def __len__(self) -> int:
        """Return sample count."""
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Return one spatial sequence, location indexes, and target."""
        seq, lat_idx, lon_idx, target, _ = self.samples[index]
        patch = _sequence_to_patch(seq)
        return (
            torch.from_numpy(patch),
            torch.tensor(lat_idx, dtype=torch.long),
            torch.tensor(lon_idx, dtype=torch.long),
            torch.tensor(target, dtype=torch.float32),
        )


@dataclass
class CNNTrainingResult:
    """Training result and denormalization parameters."""

    model: CNNLSTMAQIModel
    target_mean: float
    target_std: float
    best_val_r2: float
    test_r2: float


def train_cnn_lstm(
    train: pd.DataFrame,
    validation: pd.DataFrame,
    test: pd.DataFrame,
    config: dict[str, int | float],
    seed: int = 42,
) -> CNNTrainingResult:
    """Train CNN-LSTM with early stopping and gradient clipping."""
    torch.manual_seed(seed)
    np.random.seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    target_mean = float(train["aqi"].mean())
    target_std = float(train["aqi"].std() or 1.0)
    sequence_length = int(config["sequence_length"])
    train_ds = AQISequenceDataset(
        train,
        sequence_length,
        target_mean,
        target_std,
        max_sequences=int(config["max_train_sequences"]),
        seed=seed,
    )
    val_ds = AQISequenceDataset(
        validation,
        sequence_length,
        target_mean,
        target_std,
        max_sequences=int(config["max_eval_sequences"]),
        seed=seed + 1,
    )
    test_ds = AQISequenceDataset(
        test,
        sequence_length,
        target_mean,
        target_std,
        max_sequences=int(config["max_eval_sequences"]),
        seed=seed + 2,
    )
    model = CNNLSTMAQIModel(channels=int(config["spatial_channels"])).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(config["learning_rate"]), weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2)
    train_loader = DataLoader(train_ds, batch_size=int(config["batch_size"]), shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=int(config["batch_size"]), shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=int(config["batch_size"]), shuffle=False)
    best_state = None
    best_r2 = -999.0
    patience_counter = 0

    for epoch in range(int(config["epochs"])):
        model.train()
        for spatial, lat_idx, lon_idx, target in train_loader:
            spatial = spatial.to(device)
            lat_idx = lat_idx.to(device)
            lon_idx = lon_idx.to(device)
            target = target.to(device)
            pred, sigma = model(spatial, lat_idx, lon_idx)
            loss = gaussian_nll_loss(pred, sigma, target)
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
        scheduler.step(epoch + 1)
        val_pred, val_true, _ = predict_loader(model, val_loader, device, target_mean, target_std)
        r2 = float(r2_score(val_true, val_pred)) if len(val_true) else -999.0
        if r2 > best_r2:
            best_r2 = r2
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= int(config["patience"]):
                break

    if best_state:
        model.load_state_dict(best_state)
    test_pred, test_true, _ = predict_loader(model, test_loader, device, target_mean, target_std)
    test_r2 = float(r2_score(test_true, test_pred)) if len(test_true) else -999.0
    return CNNTrainingResult(model=model, target_mean=target_mean, target_std=target_std, best_val_r2=best_r2, test_r2=test_r2)


def predict_loader(
    model: CNNLSTMAQIModel,
    loader: DataLoader,
    device: torch.device,
    target_mean: float,
    target_std: float,
    mc_samples: int = 1,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Predict AQI and uncertainty for a dataloader."""
    model.eval()
    preds: list[np.ndarray] = []
    sigmas: list[np.ndarray] = []
    truth: list[np.ndarray] = []
    if len(loader) == 0:
        dataset_size = len(loader.dataset) if hasattr(loader, "dataset") else 0
        raise ValueError(
            "predict_loader received an empty DataLoader. "
            f"dataset_size={dataset_size}, batch_size={getattr(loader, 'batch_size', 'unknown')}. "
            "Check sequence_length and date window size."
        )
    for spatial, lat_idx, lon_idx, target in loader:
        spatial = spatial.to(device)
        lat_idx = lat_idx.to(device)
        lon_idx = lon_idx.to(device)
        with torch.no_grad():
            pred, sigma = model(spatial, lat_idx, lon_idx)
            epistemic = []
            if mc_samples > 1:
                _enable_dropout(model)
                for _ in range(mc_samples):
                    pred_i, _ = model(spatial, lat_idx, lon_idx)
                    epistemic.append(pred_i.detach().cpu().numpy())
                model.eval()
        pred_np = pred.detach().cpu().numpy() * target_std + target_mean
        aleatoric = sigma.detach().cpu().numpy() * target_std
        if epistemic:
            epistemic_sigma = np.std(np.vstack(epistemic), axis=0) * target_std
            total_sigma = np.sqrt(aleatoric**2 + epistemic_sigma**2)
        else:
            total_sigma = aleatoric
        preds.append(pred_np)
        sigmas.append(total_sigma)
        truth.append(target.numpy() * target_std + target_mean)
    if not preds:
        raise ValueError("predict_loader collected 0 prediction batches after iteration.")
    return np.concatenate(preds), np.concatenate(truth), np.concatenate(sigmas)


def _sequence_to_patch(sequence: np.ndarray, grid_size: int = 13) -> np.ndarray:
    """Convert channel sequence to small spatial patches with directional gradients."""
    seq = sequence.astype(np.float32)
    offsets = np.linspace(-1.0, 1.0, grid_size, dtype=np.float32)
    yy, xx = np.meshgrid(offsets, offsets, indexing="ij")
    patches = []
    for row in seq:
        base = row[:, None, None]
        gradients = 1.0 + 0.015 * xx[None, :, :] * np.arange(1, len(row) + 1)[:, None, None]
        gradients += 0.012 * yy[None, :, :] * np.flip(np.arange(1, len(row) + 1))[:, None, None]
        patches.append(base * gradients)
    return np.stack(patches, axis=0).astype(np.float32)


def _lat_to_index(lat: float) -> int:
    return int(np.clip(round((lat - 6.0) * 2), 0, 99))


def _lon_to_index(lon: float) -> int:
    return int(np.clip(round((lon - 65.0) * 2), 0, 199))


def _enable_dropout(model: nn.Module) -> None:
    for module in model.modules():
        if isinstance(module, nn.Dropout):
            module.train()
