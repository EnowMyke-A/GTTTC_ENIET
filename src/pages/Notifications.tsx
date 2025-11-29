import { useState } from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { Bell, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dummy notification data - empty for demonstration
const dummyNotifications: any[] = [];

const Notifications = () => {
  const [notifications, setNotifications] = useState(dummyNotifications);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <X className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-primary/5 border-primary/20";
    }
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
              Notifications
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Stay updated with the latest activities
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary text-primary-foreground collapsible-content"
              data-state="open"
            >
              {unreadCount} unread
            </Badge>
          )}
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            className="bg-muted hover:bg-accent/30 border-0"
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="shadow-none border-0">
          <CardContent className="py-12 pt-6">
            <div className="text-center space-y-4">
              <LottieAnimation
                animationData={animationData}
                width={300}
                height={300}
                loop={true}
                autoplay={true}
                className="m-auto"
              />
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground">
                  No Notifications
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You're all caught up! No new notifications at the moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <div className="space-y-1">
              {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 transition-colors hover:bg-muted/50 ${getTypeColor(
                  notification.type
                )} ${
                  !notification.isRead
                    ? "bg-primary/5 border-l-primary"
                    : "border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex items-start space-x-3 flex-1">
                    {getIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`font-medium ${
                            !notification.isRead
                              ? "text-muted-foreground"
                              : "text-muted-foreground/70"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-primary rounded-full collapsible-content" data-state="open" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.time}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!notification.isRead && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs collapsible-content"
                          data-state="open"
                        >
                          Mark as Read
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteNotification(notification.id)}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-accent/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
