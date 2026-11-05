const ContactMessage = require("../models/ContactMessage");
const { logAction } = require("../utils/audit");

const TYPES = ["Visitor", "Active Member", "Committee Member"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PUBLIC: POST /api/contact
exports.submit = async (req, res, next) => {
  try {
    const b = req.body;
    // Hidden field only bots fill in: pretend it worked, save nothing
 if (b.hp_check) {
  console.log("Contact spam trap triggered, message dropped");
  return res.status(201).json({ message: "Message sent" });}

    const name = (b.fullName || "").trim();
    const email = (b.email || "").trim();
    const subject = (b.subject || "").trim();
    const message = (b.message || "").trim();
    const user_type = TYPES.includes(b.userType) ? b.userType : "Visitor";

    if (name.length < 2 || name.length > 120)
      return res.status(400).json({ message: "Please enter your full name" });
    if (!EMAIL.test(email) || email.length > 120)
      return res
        .status(400)
        .json({ message: "Please enter a valid email address" });
    if (!subject || subject.length > 200)
      return res
        .status(400)
        .json({ message: "Please enter a subject (max 200 characters)" });
    if (message.length < 5 || message.length > 3000)
      return res
        .status(400)
        .json({ message: "Your message must be 5 to 3000 characters" });

    await ContactMessage.create({ name, email, subject, user_type, message });
    res.status(201).json({ message: "Message sent" });
  } catch (err) {
    next(err);
  }
};

// ADMIN: GET /api/contact?status=new|replied|all
exports.list = async (req, res, next) => {
  try {
    const [messages, unread] = await Promise.all([
      ContactMessage.list(req.query.status),
      ContactMessage.countUnread(),
    ]);
    res.json({ messages, unread });
  } catch (err) {
    next(err);
  }
};

exports.read = async (req, res, next) => {
  try {
    if (!(await ContactMessage.markRead(Number(req.params.id))))
      return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

exports.replied = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await ContactMessage.markReplied(id, req.user.id)))
      return res.status(404).json({ message: "Message not found" });
    await logAction(req.user.id, "MESSAGE_REPLIED", "contact_message", id);
    res.json({ message: "Marked as replied" });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await ContactMessage.remove(id)))
      return res.status(404).json({ message: "Message not found" });
    await logAction(req.user.id, "MESSAGE_DELETED", "contact_message", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
