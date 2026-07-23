import { useAppStore } from "../../store/appStore";

export function NotificationCenter() {
  const { notifications, removeNotification } = useAppStore();
  return (
    <div className="toast-stack" aria-live="polite">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          className={`toast toast-${notification.type}`}
          type="button"
          onClick={() => removeNotification(notification.id)}
        >
          {notification.message}
        </button>
      ))}
    </div>
  );
}

