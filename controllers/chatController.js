const User = require('../models/User')
const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage')
const mongoose = require('mongoose');
const Group = require('../models/Group')

module.exports.chatController = async (req, res) => {
    const users = await User.find({ _id: { $ne: req.cookies.user_id } });
    const groups = await Group.find({ 
        $or: [
                { members: { $in: [req.cookies.user_id] } }, // Agar user members me hai
                { createdBy: req.cookies.user_id } // Ya agar user ne group banaya hai
            ]
        }).populate('createdBy');
    const senderUser = await User.findById(req.cookies.user_id);
    res.render('chat', { users, groups, senderUser })
}
module.exports.mainChatController = async (req, res) => {

    const userId = req.params.userId;
    const users = await User.find({ _id: { $ne: req.cookies.user_id } });
    const groups = await Group.find({ 
        $or: [
                { members: { $in: [req.cookies.user_id] } }, // Agar user members me hai
                { createdBy: req.cookies.user_id } // Ya agar user ne group banaya hai
            ]
        }).populate('createdBy')
    const receiverUser = await User.findById(userId);
    const senderUser = await User.findById(req.cookies.user_id);

    res.render('main_chat', {receiverUser, senderUser,groups, users})
}

module.exports.MessagesController = async (req, res) => {
    if (!req.cookies.user_id) {
        return res.status(401).send("Unauthorized - User not found");
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return res.status(400).send("Invalid User ID");
    }

    try {
        const messages = await Message.find({
            $or: [
                { senderId: req.cookies.user_id, receiverId: req.params.userId },
                { senderId: req.params.userId, receiverId: req.cookies.user_id }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).send("Server error");
    }
}

module.exports.allUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.cookies.user_id } });
        res.json(users);
    } catch (err) {
        res.status(500).send("Server error");
    }
}

module.exports.createGroupController = async (req, res) => {
    const { name, members } = req.body;

    // ✅ Ensure user authentication
    if (!req.user || !req.cookies.user_id) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    const createdBy = req.cookies.user_id.toString();

    // ✅ Input Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Group name is required" });
    }

    if (!Array.isArray(members)) {
        return res.status(400).json({ error: "Members must be an array" });
    }

    try {
        // ✅ Add creator to members array if not already present
        const updatedMembers = [...new Set([...members, createdBy])];

        // ✅ Convert string IDs to ObjectId
        const memberObjectIds = updatedMembers.map(id => {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error(`Invalid member ID: ${id}`);
            }
            return new mongoose.Types.ObjectId(id);
        });

        const newGroup = new Group({
            name,
            members: memberObjectIds,
            createdBy
        });

        await newGroup.save();

        res.status(201).json({ message: "✅ Group created successfully", group: newGroup });
    } catch (error) {
        console.error("❌ Error creating group:", error);
        res.status(500).json({ error: error.message || "Failed to create group" });
    }
};


module.exports.groupChatController = async (req, res) => {
 try {
        const { group_id } = req.params;
        
        // Validate group_id
        if (!mongoose.Types.ObjectId.isValid(group_id)) {
            return res.status(400).json({ error: "Invalid group ID" });
        }

        const users = await User.find({ _id: { $ne: req.cookies.user_id } });
        const groups = await Group.find({ 
            $or: [
                    { members: { $in: [req.cookies.user_id] } }, // Agar user members me hai
                    { createdBy: req.cookies.user_id } // Ya agar user ne group banaya hai
                ]
        }).populate('createdBy')
        // Find the group and check if user is a member
        const Currentgroup = await Group.findById(group_id).populate('messages').populate('createdBy').populate('members');
        const senderUser = await User.findById(req.cookies.user_id);
        if (!Currentgroup) return res.status(404).json({ error: "Group not found" });

        const nonGroupUsers = await User.find({
            _id: {
              $nin: [...Currentgroup.members, Currentgroup.createdBy], // exclude members and creator
            },
          });

        res.render("groupchat", {
            Currentgroup, // jo group open kara hai
            users, // saare users sivae mere
            groups, // vo saare groups jisse user(hum) link
            senderUser, // jo user loged in hai
            nonGroupUsers
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports.addMemberController = async (req, res) => {
    const group_id = req.params.group_id;
    const { users } = req.body; // ✅ Extract users array from the object

    try {
        const group = await Group.findById(group_id);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        const existingMemberIds = group.members.map(id => id.toString());

        const newMembers = users.filter(id => !existingMemberIds.includes(id));

        group.members.push(...newMembers);

        await group.save();

        res.status(200).json({ message: "Members added successfully", group });
    } catch (error) {
        console.error("❌ Error adding member to group:", error);
        res.status(500).json({ error: error.message || "Failed to add member to group" });
    }
}

module.exports.deleteMemberController = async (req, res) => {
    const group_id = req.params.group_id;
    const { users } = req.body; // ✅ Extract users array from the object

    try {
        const group = await Group.findById(group_id);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // ✅ Filter out users that are to be deleted from the members array
        group.members = group.members.filter(memberId => !users.includes(memberId.toString()));

        await group.save();

        res.status(200).json({ message: "Selected members removed successfully", group });
    } catch (error) {
        console.error("❌ Error deleting members from group:", error);
        res.status(500).json({ error: error.message || "Failed to delete members from group" });
    }
};

// Controller
module.exports.allGroupMessagesController = async (req, res) => {
    const groupId = req.params.group_id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).send("Invalid Group ID");
    }

    try {
        const messages = await GroupMessage.find({ group: groupId })
            .populate('sender') // 🧠 ensure sender has ref: 'User'
            .sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        console.error("❌ Error fetching group messages:", err);
        res.status(500).send("Server error");
    }
};

