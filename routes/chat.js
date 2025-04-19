const express = require('express');
const router = express.Router();
const { 
    chatController,
    mainChatController,
    MessagesController,
    allUsers,
    createGroupController,
    groupChatController,
    addMemberController,
    deleteMemberController,
    allGroupMessagesController
 } = require('../controllers/chatController');
const {isLoggedIn} = require('../middlewares/isLoggedIn');

router.get('/',isLoggedIn, chatController);
router.get('/users',isLoggedIn, allUsers);
router.get('/:userId', isLoggedIn, mainChatController);
router.get('/:userId/messages', isLoggedIn, MessagesController);

// group chats route
router.post('/create-group', isLoggedIn, createGroupController);
router.get('/group/:group_id', isLoggedIn, groupChatController);
router.post('/group/:group_id/addmembers', isLoggedIn, addMemberController);
router.post('/group/:group_id/deletemembers', isLoggedIn, deleteMemberController);
router.get('/group/:group_id/groupmessages', isLoggedIn, allGroupMessagesController);

module.exports = router;