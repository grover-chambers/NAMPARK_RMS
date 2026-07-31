import { prisma } from "@/lib/prisma";
import { webPush } from "@/lib/push";

interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  push?: boolean;
}

export async function createNotification(input: CreateNotificationInput) {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId: input.userId, type: input.type } },
  });
  if (pref && !pref.enabled) return null;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      link: input.link,
    },
  });

  if (input.push) {
    await sendPushNotification(input.userId, input.title, input.body, input.link);
  }

  return notification;
}

export async function createNotificationForRole(
  role: string,
  input: Omit<CreateNotificationInput, "userId">
) {
  const users = await prisma.user.findMany({
    where: { role: role as any, isActive: true },
    select: { id: true },
  });

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((u) => u.id) }, type: input.type, enabled: false },
  });
  const optedOut = new Set(prefs.map((p) => p.userId));

  const notifications = [];
  for (const user of users) {
    if (optedOut.has(user.id)) continue;

    const n = await prisma.notification.create({
      data: {
        userId: user.id,
        title: input.title,
        body: input.body,
        type: input.type,
        link: input.link,
      },
    });
    notifications.push(n);

    if (input.push) {
      await sendPushNotification(user.id, input.title, input.body, input.link);
    }
  }

  return notifications;
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, url })
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (e) {
    console.error("Push notification error:", e);
  }
}
