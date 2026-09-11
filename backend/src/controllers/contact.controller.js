import { prisma } from '../lib/prisma.js';
import { sendEnquiryNotification } from '../lib/mailer.js';
import { ApiError, asyncHandler } from '../utils/errors.js';

/**
 * POST /api/contact — public.
 * The enquiry is always written to the database first; the email notification
 * is best-effort so an SMTP outage never loses a lead.
 */
export const submitContact = asyncHandler(async (req, res) => {
  const { website, machineId, ...payload } = req.body;

  // Honeypot — a bot filled the hidden field. Answer 200 so it learns nothing.
  if (website) {
    return res.status(201).json({
      success: true,
      data: { message: 'Thank you, your enquiry has been received.' },
    });
  }

  // Only link a machine that actually exists; a stale id must not reject the form.
  let machine = null;
  if (machineId) {
    machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true, slug: true, nameEn: true, nameAr: true },
    });
  }

  const message = await prisma.contactMessage.create({
    data: {
      ...payload,
      machineId: machine?.id ?? null,
      ipAddress: req.ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 400),
    },
  });

  const notification = await sendEnquiryNotification(message, machine);

  return res.status(201).json({
    success: true,
    data: {
      id: message.id,
      message: 'Thank you, your enquiry has been received. Our team will be in touch shortly.',
      emailDelivered: notification.sent,
    },
  });
});

/** GET /api/contact — admin inbox */
export const listMessages = asyncHandler(async (req, res) => {
  const query = req.validatedQuery;

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { subject: { contains: query.search, mode: 'insensitive' } },
            { message: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, unread, items] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.contactMessage.findMany({
      where,
      include: { machine: { select: { id: true, slug: true, nameEn: true, nameAr: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      total,
      unread,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  });
});

/** GET /api/contact/:id — reading an enquiry marks it as read. */
export const getMessage = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.findUnique({
    where: { id: req.params.id },
    include: { machine: { select: { id: true, slug: true, nameEn: true, nameAr: true } } },
  });
  if (!message) throw ApiError.notFound('Message not found');

  if (message.status === 'NEW') {
    await prisma.contactMessage.update({ where: { id: message.id }, data: { status: 'READ' } });
    message.status = 'READ';
  }

  res.json({ success: true, data: message });
});

/** PATCH /api/contact/:id */
export const updateMessageStatus = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json({ success: true, data: message });
});

/** DELETE /api/contact/:id */
export const deleteMessage = asyncHandler(async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id, message: 'Message deleted' } });
});

/** GET /api/contact/stats/overview — dashboard tiles */
export const dashboardStats = asyncHandler(async (_req, res) => {
  const [machines, published, sold, categories, newMessages, totalMessages, recent] =
    await Promise.all([
      prisma.machine.count(),
      prisma.machine.count({ where: { isPublished: true } }),
      prisma.machine.count({ where: { status: 'SOLD' } }),
      prisma.category.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.contactMessage.count(),
      prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          createdAt: true,
          email: true,
        },
      }),
    ]);

  const topViewed = await prisma.machine.findMany({
    where: { isPublished: true },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: { id: true, slug: true, nameEn: true, nameAr: true, viewCount: true, status: true },
  });

  res.json({
    success: true,
    data: {
      machines: { total: machines, published, drafts: machines - published, sold },
      categories,
      messages: { total: totalMessages, unread: newMessages },
      recentMessages: recent,
      topViewed,
    },
  });
});
