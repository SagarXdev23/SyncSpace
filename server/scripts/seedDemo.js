
require('dotenv').config();

const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');
const Comment = require('../models/Comment');
const File = require('../models/File');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Invite = require('../models/Invite');

const DEMO_EMAIL = 'demo@syncspace.local';
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD;
const TEAMMATE_PASSWORD = randomBytes(24).toString('base64url');
const WORKSPACE_FIXTURES = [
  {
    name: 'Product Launch',
    description: 'Plan the next SyncSpace product launch across the whole team.',
    projects: ['Launch Planning', 'Website Refresh'],
  },
  {
    name: 'Design Studio',
    description: 'A shared space for design reviews, assets, and experiments.',
    projects: ['Mobile App', 'Design System'],
  },
  {
    name: 'Ops Hub',
    description: 'Operations tasks, customer support, and team processes.',
    projects: ['Customer Success', 'Internal Tools'],
  },
];

function assertLocalDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is required to seed demo data.');

  if (process.env.ALLOW_REMOTE_DEMO_SEED === 'true') return;

  let hostname;
  try {
    hostname = new URL(uri).hostname.toLowerCase();
  } catch {
    throw new Error('MONGODB_URI is invalid; refusing to seed an unknown database.');
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname.replace(/^\[|\]$/g, ''))) {
    throw new Error('Demo seeding is limited to local MongoDB (localhost) to protect shared data.');
  }
}

async function findOrCreateUser({ name, email, password, resetPassword = false }) {
  let user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) {
    user = new User({ name, email, password });
  } else if (resetPassword) {
    user.name = name;
    user.password = password;
    user.refreshTokens = [];
  }
  await user.save();
  return user;
}

async function clearPreviousSeed(demoUser) {
  const workspaces = await Workspace.find({
    owner: demoUser._id,
    name: { $in: WORKSPACE_FIXTURES.map((workspace) => workspace.name) },
  }).select('_id');
  const workspaceIds = workspaces.map((workspace) => workspace._id);
  if (!workspaceIds.length) return;

  const projects = await Project.find({ workspace: { $in: workspaceIds } }).select('_id');
  const projectIds = projects.map((project) => project._id);
  const tasks = projectIds.length
    ? await Task.find({ project: { $in: projectIds } }).select('_id')
    : [];
  const taskIds = tasks.map((task) => task._id);

  await Promise.all([
    Invite.deleteMany({ workspace: { $in: workspaceIds } }),
    Notification.deleteMany({
      'relatedEntity.id': { $in: [...workspaceIds, ...taskIds] },
    }),
    Activity.deleteMany({ workspace: { $in: workspaceIds } }),
    Message.deleteMany({ workspace: { $in: workspaceIds } }),
    File.deleteMany({ workspace: { $in: workspaceIds } }),
    taskIds.length ? Comment.deleteMany({ task: { $in: taskIds } }) : Promise.resolve(),
    projectIds.length ? Task.deleteMany({ project: { $in: projectIds } }) : Promise.resolve(),
    Project.deleteMany({ workspace: { $in: workspaceIds } }),
    Workspace.deleteMany({ _id: { $in: workspaceIds } }),
  ]);
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    throw new Error('Set DEMO_ACCOUNT_PASSWORD to a private password of at least 8 characters.');
  }
  assertLocalDatabase(uri);
  await mongoose.connect(uri);

  const demoUser = await findOrCreateUser({
    name: 'SyncSpace Demo',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    resetPassword: true,
  });
  const teammates = await Promise.all([
    findOrCreateUser({ name: 'Avery Chen', email: 'avery@syncspace.test', password: TEAMMATE_PASSWORD }),
    findOrCreateUser({ name: 'Jordan Lee', email: 'jordan@syncspace.test', password: TEAMMATE_PASSWORD }),
    findOrCreateUser({ name: 'Morgan Patel', email: 'morgan@syncspace.test', password: TEAMMATE_PASSWORD }),
  ]);

  await clearPreviousSeed(demoUser);

  const now = Date.now();
  let projectsCreated = 0;
  let tasksCreated = 0;

  for (const [workspaceIndex, fixture] of WORKSPACE_FIXTURES.entries()) {
    const workspace = await Workspace.create({
      name: fixture.name,
      description: fixture.description,
      owner: demoUser._id,
      members: [
        { user: demoUser._id, role: 'OWNER' },
        { user: teammates[workspaceIndex % teammates.length]._id, role: 'ADMIN' },
        { user: teammates[(workspaceIndex + 1) % teammates.length]._id, role: 'MEMBER' },
      ],
    });

    const projects = await Promise.all(
      fixture.projects.map((name, projectIndex) =>
        Project.create({
          workspace: workspace._id,
          name,
          description: `${name} planning, discussion, and delivery.`,
          createdBy: demoUser._id,
        }).then((project) => {
          projectsCreated += 1;
          return { project, projectIndex };
        }),
      ),
    );

    const workspaceTasks = [];
    for (const { project, projectIndex } of projects) {
      const tasks = await Task.create([
        {
          project: project._id,
          title: `${project.name}: confirm scope`,
          description: 'Review requirements with the team and agree on acceptance criteria.',
          status: 'TODO',
          priority: 'HIGH',
          assignedTo: demoUser._id,
          dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
          createdBy: demoUser._id,
        },
        {
          project: project._id,
          title: `${project.name}: prepare first draft`,
          description: 'Create a first version and request feedback from the workspace.',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assignedTo: teammates[projectIndex % teammates.length]._id,
          dueDate: new Date(now + 7 * 24 * 60 * 60 * 1000),
          createdBy: demoUser._id,
        },
        {
          project: project._id,
          title: `${project.name}: kickoff notes`,
          description: 'Share the kickoff summary and decisions with the team.',
          status: 'COMPLETED',
          priority: 'LOW',
          assignedTo: demoUser._id,
          createdBy: demoUser._id,
        },
      ]);
      workspaceTasks.push(...tasks);
      tasksCreated += tasks.length;
    }

    await Promise.all([
      Comment.create(
        workspaceTasks.slice(0, 3).map((task, index) => ({
          task: task._id,
          author: index === 1 ? teammates[workspaceIndex % teammates.length]._id : demoUser._id,
          content: [
            'I added the initial requirements. Please add anything we missed.',
            'Draft is underway; I will post an update after the review.',
            'Kickoff notes are ready for everyone to review.',
          ][index],
        })),
      ),
      Message.create([
        {
          workspace: workspace._id,
          sender: demoUser._id,
          content: `Welcome to ${workspace.name}! Use this channel for quick updates.`,
        },
        {
          workspace: workspace._id,
          sender: teammates[workspaceIndex % teammates.length]._id,
          content: 'Thanks! I have added my first updates to the project board.',
        },
        {
          workspace: workspace._id,
          sender: demoUser._id,
          content: 'Great. Let us review progress together at the next check-in.',
        },
      ]),
      File.create([
        {
          workspace: workspace._id,
          uploadedBy: demoUser._id,
          filename: `${fixture.name.toLowerCase().replace(/\s+/g, '-')}-brief.pdf`,
          url: 'https://example.com/',
          publicId: `demo-fixture/${workspace._id}/brief`,
          resourceType: 'raw',
          size: 184320,
          mimeType: 'application/pdf',
        },
        {
          workspace: workspace._id,
          uploadedBy: teammates[workspaceIndex % teammates.length]._id,
          filename: `${fixture.name.toLowerCase().replace(/\s+/g, '-')}-reference.png`,
          url: 'https://placehold.co/1200x800/png',
          publicId: `demo-fixture/${workspace._id}/reference`,
          resourceType: 'image',
          size: 451200,
          mimeType: 'image/png',
        },
      ]),
      Activity.create([
        {
          workspace: workspace._id,
          user: demoUser._id,
          action: 'workspace.created',
          entity: { kind: 'workspace', id: workspace._id },
        },
        {
          workspace: workspace._id,
          user: demoUser._id,
          action: 'project.created',
          entity: { kind: 'project', id: projects[0].project._id },
        },
        {
          workspace: workspace._id,
          user: teammates[workspaceIndex % teammates.length]._id,
          action: 'task.completed',
          entity: { kind: 'task', id: workspaceTasks[2]._id },
        },
        {
          workspace: workspace._id,
          user: demoUser._id,
          action: 'file.uploaded',
          entity: { kind: 'file', id: workspace._id },
        },
      ]),
      Notification.create([
        {
          user: demoUser._id,
          type: 'task.assigned',
          message: `You have a new task in ${fixture.projects[0]}.`,
          relatedEntity: { kind: 'task', id: workspaceTasks[0]._id },
        },
        {
          user: demoUser._id,
          type: 'comment.added',
          message: `A teammate commented on ${fixture.projects[0]}.`,
          relatedEntity: { kind: 'task', id: workspaceTasks[1]._id },
        },
        {
          user: demoUser._id,
          type: 'workspace.invite',
          message: `You are ready to invite teammates to ${workspace.name}.`,
          relatedEntity: { kind: 'workspace', id: workspace._id },
        },
      ]),
      Invite.create({
        token: Invite.generateToken(),
        workspace: workspace._id,
        role: 'MEMBER',
        expiresAt: new Date(now + 14 * 24 * 60 * 60 * 1000),
        maxUses: 5,
        usedCount: 0,
        createdBy: demoUser._id,
      }),
    ]);
  }

  console.log(`[demo] Account: ${DEMO_EMAIL}`);
  console.log(`[demo] Seeded ${WORKSPACE_FIXTURES.length} workspaces, ${projectsCreated} projects, ${tasksCreated} tasks, comments, messages, files, notifications, activity, and invite links.`);
}

seed()
  .catch((err) => {
    console.error(`[demo] Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
