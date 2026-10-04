/**
 * Task comment controller.
 * Anyone in the workspace can comment; only the author or an ADMIN+ can
 * edit/delete a comment.
 */
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Comment = require('../models/Comment');
const activityService = require('../services/activityService');
const notificationService = require('../services/notificationService');
const { getIo } = require('../sockets/socketHandler');

function populatedComment(id) {
  return Comment.findById(id).populate('author', 'name email avatar').lean();
}

const createComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await Comment.create({
    task: req.task._id,
    author: req.user._id,
    content: content.trim(),
  });

  await activityService.log(req.workspace._id, req.user._id, 'comment.added', 'comment', comment._id);

  // Notify the assignee and the task creator (when they aren't the commenter).
  const notifyTargets = new Map();
  for (const candidate of [req.task.assignedTo, req.task.createdBy]) {
    if (candidate && candidate.toString() !== req.user._id.toString()) {
      notifyTargets.set(candidate.toString(), candidate);
    }
  }
  for (const targetId of notifyTargets.keys()) {
    await notificationService.create({
      user: targetId,
      type: 'comment.added',
      message: `${req.user.name} commented on task "${req.task.title}"`,
      relatedEntity: { kind: 'comment', id: comment._id },
    });
  }

  const io = getIo();
  const populated = await populatedComment(comment._id);
  if (io) {
    io.to(`workspace:${req.workspace._id}`).emit('comment:added', {
      workspaceId: req.workspace._id,
      taskId: req.task._id,
      comment: populated,
    });
  }

  res.status(201).json({ success: true, data: populated });
});

const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ task: req.task._id })
    .populate('author', 'name email avatar')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ success: true, data: comments });
});

function assertCanModerate(req) {
  const isAuthor = req.comment.author.toString() === req.user._id.toString();
  if (!isAuthor && !['OWNER', 'ADMIN'].includes(req.memberRole)) {
    throw new ApiError('Only the comment author or workspace admins can modify this comment', 403);
  }
}

const updateComment = asyncHandler(async (req, res) => {
  assertCanModerate(req);
  req.comment.content = req.body.content.trim();
  await req.comment.save();
  const populated = await populatedComment(req.comment._id);
  res.json({ success: true, data: populated });
});

const deleteComment = asyncHandler(async (req, res) => {
  assertCanModerate(req);
  await Comment.deleteOne({ _id: req.comment._id });
  res.json({ success: true, message: 'Comment deleted' });
});

module.exports = { createComment, listComments, updateComment, deleteComment };
