var express = require('express');
var session = require('express-session');
var router = express.Router();
var Transection = require('../models/transections')
var Renter = require('../models/renters')
var Rented = require('../models/rented_persons')
var Service = require('../models/services')
const path = require('path');

var confirmationSignal = -1;
var time = 0;
/* GET home page. */
//----------function----------
function removeRoute(routePath) {
  router.stack.forEach((layer, index, stack) => {
    if (layer.route && layer.route.path === routePath && layer.route.methods.get) {
        stack.splice(index, 1); // Remove the route from the stack
    }
  });

  console.log(`Route ${routePath} đã bị xóa.`);
}

async function updateMoneyById(ID_client, NewMoneyValue) {
  const filter = { _id: ID_client };
  const update = { $set: { money: NewMoneyValue } };

  const result = await Renter.updateMany(filter, update);
  console.log(`${result.modifiedCount} documents were updated`);
}

async function updatePasswordById(ID, NewPassword, role) {
  const filter = { _id: ID };
  const update = { $set: { password: NewPassword } };

  if (role == 'renter'){
    const result = await Renter.updateMany(filter, update);
    console.log(`${result.modifiedCount} mật khẩu đã được cập nhật`);
  }
  else {
    const result = await Rented.updateMany(filter, update);
    console.log(`${result.modifiedCount} mật khẩu đã được cập nhật`);
  }
}

async function updateInforByID(ID_client, adjust_img, adjust_name, adjust_gender, birthday, adjust_phone, adjust_address, role) {
  const Birthday = new Date(birthday);
  const year_b = Birthday.getFullYear();
  const month_b = (Birthday.getMonth() + 1).toString().padStart(2, '0'); 
  const day_b = Birthday.getDate().toString().padStart(2, '0');
  const adjust_birthday  = new Date(year_b + '-' + month_b + '-' + day_b);

  const filter = { _id: ID_client };
  const update_infor = { $set: { name: adjust_name, gender: adjust_gender, birthday: adjust_birthday, phone: adjust_phone, address: adjust_address } };
  const update_avatar = {$set: {avatar: adjust_img}};

  if (adjust_img != ""){
    const result1 = await Renter.updateMany(filter, update_avatar);
    const result2 = await Rented.updateMany(filter, update_avatar);
  }

  if (role == "renter"){
    const result = await Renter.updateMany(filter, update_infor);
    console.log(`${result.modifiedCount} documents were updated in renter`);
  }
  else {
    const result = await Rented.updateMany(filter, update_infor);
    console.log(`${result.modifiedCount} documents were updated in rented`);
  }
}

async function updateServiceByID(newData, ID, up) {
  try {
    const user = await Rented.findOne({ _id: ID });

    if (user) {
      if (up == "add"){
        user.service.push(newData);
      }
      else {
        var index = user.service.indexOf(newData);
        user.service.splice(index, 1);
      }
      await user.save();
      console.log(`Dữ liệu của người dùng ${user.name} đã được cập nhật.`);
    } else {
      console.log(`Không tìm thấy người dùng với username: ${user.name}.`);
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật dữ liệu người dùng:', error.message);
  }
}

//----------Send full html----------
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/Home/Home.html'));
});

router.get('/Recharge', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/Recharge/Recharge.html'));
});

router.get('/Order', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/player_orderConfirmation/Order.html'));
});

router.get('/Infor', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/Change_info/Infor.html'));
});

//----------Get database----------
router.get('/Data/Renters', async (req, res) => {
  try {
    const data = await Renter.find({}); // Lấy dữ liệu từ database
    res.json(data); // Gửi dữ liệu dưới dạng JSON về client
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/Data/Rented_persons', async (req, res) => {
  try {
    const data = await Rented.find({}); // Lấy dữ liệu từ database
    res.json(data); // Gửi dữ liệu dưới dạng JSON về client
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.get('/Data/Services', async (req, res) => {
  try {
    const data = await Service.find({}); // Lấy dữ liệu từ database
    res.json(data); // Gửi dữ liệu dưới dạng JSON về client
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

//----------session----------
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

router.use(express.json());

router.post('/Login', (req, res) => {
  const userId = req.body.userId;
  const type = req.body.type;

  if (userId) {
    req.session.userId = userId;
    req.session.type = type;
    res.send('Đăng nhập thành công');
  } else {
    res.status(400).send('Thiếu thông tin đăng nhập');
  }
});

router.post('/Home/Rented', (req, res) => {
  const rentedId = req.body.rentedId;
  req.session.rentedId = rentedId;
  res.json({ success: true });
});

router.post('/Logout', (req, res) => {
  req.session.userId = null;
  req.session.type = null;
  res.send('Đăng xuất thành công');
});

router.get('/Logged-In-User', (req, res) => {
  const loggedInUser = req.session.userId;
  const typeInUser = req.session.type;
  const interact = req.session.interact;

  req.session.interact = null; //không tương tác với Home

  if (loggedInUser) {
    res.json({ loggedIn: true, type: typeInUser, userId: loggedInUser , interact: interact});
  } else {
    res.json({ loggedIn: false , interact: interact});
  }
});

router.get('/Home/Rented_Current', (req, res) => {
  const rentedID = req.session.rentedId;

  if (rentedID) {
    res.json({ rentedId: rentedID });
  } else {
    res.json({ rentedId: null });
  }
});


//----------Đăng kí----------

router.post('/Register', (req, res) => {
  res.json({success: true});
  if (req.body.res_role == "renter"){
    const dummyUser = {
      name: req.body.res_name,
      birthday: new Date(req.body.res_birthday),
      gender: req.body.res_gender,
      address: req.body.res_address,
      phone: req.body.res_phone,
      email: req.body.res_email,
      joining_date: new Date(),
      money: 0,
      rented_object: [],
      password: req.body.res_password,
      avatar: "https://i.postimg.cc/sfQbt6Jj/c6e56503cfdd87da299f72dc416023d4.jpg",
    };
    Renter.create(dummyUser)
    .then((createdUser) => {
      console.log('Thêm vào database thành công:', createdUser);
    })
    .catch((err) => {
      console.error('Lỗi khi thêm vào database:', err);
    }); 
  }
  else {
    const dummyUser = {
      name: req.body.res_name,
      birthday: new Date(req.body.res_birthday),
      gender: req.body.res_gender,
      address: req.body.res_address,
      phone: req.body.res_phone,
      email: req.body.res_email,
      joining_date: new Date(),
      evaluate: 0,
      service: [],
      password: req.body.res_password,
      avatar: "https://i.postimg.cc/sfQbt6Jj/c6e56503cfdd87da299f72dc416023d4.jpg",
    };
    Rented.create(dummyUser)
    .then((createdUser) => {
      console.log('Thêm vào database thành công:', createdUser);
    })
    .catch((err) => {
      console.error('Lỗi khi thêm vào database:', err);
    });
  }
});

//----------Recharge----------

router.get('/Recharge/data-QR', (req, res) => {
    res.json({confirmation: confirmationSignal});
  });

router.post('/Recharge/Confirm', (req, res) => {
  confirmationSignal = 1;
  res.json({ success: true});
});

router.post('/Recharge/QR', async (req, res) => {
  confirmationSignal = 0;
  time = 0;

  router.get('/Recharge/Confirm-QR', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Recharge/Confirm_QR.html'));
  });

  var waitPay = setInterval(() => {  //sau 30s không thanh toán thì thanh toán không thành công
    time = time + 1;
    if (time == 30){
      confirmationSignal = -1;
      removeRoute('/Recharge/Confirm-QR'); // Xóa route sau 2 phút
      clearInterval(waitPay);
    }
    else if (confirmationSignal == 1){
      removeRoute('/Recharge/Confirm-QR');
      clearInterval(waitPay);
    }
  }, 1000); // 30 giây
});

router.post('/Recharge/UpdateMoney', (req, res) => {
  const _id = req.body._id;
  const NewMoney = req.body.money;
  updateMoneyById(_id, NewMoney);
});

//----------Infor----------
router.post('/Infor/updateInfor', (req, res) => {
  const _id = req.body._id;
  const NewImg = req.body.link_img;
  const NewName = req.body.adjust_name;
  const NewGender = req.body.adjust_gender;
  const NewBirthday = req.body.adjust_birthday;
  const NewPhone = req.body.adjust_phone;
  const NewAddress = req.body.adjust_address;
  const role = req.body.role;

  updateInforByID(_id, NewImg, NewName, NewGender, NewBirthday, NewPhone, NewAddress, role);
});

router.post('/Infor/updateService', (req, res) => {
  const NewService = req.body.serviceId;
  const up = req.body.update;

  updateServiceByID(NewService, req.session.userId, up);
});

router.post('/Infor/updateNewPassword', (req, res) => {
  const NewPassword = req.body.password;
  updatePasswordById(req.session.userId, NewPassword, req.session.type);
});

//----------Order----------
router.post('/Order/interactHome', (req, res) => {
  const interact = req.body.interact;
  req.session.interact = interact;
  res.send('done');
});

router.post('/Order/orderConfirm', async (req, res) => {
  const rented_Id = req.body.rented_Id;
  const number_match = req.body.number_match;
  const total = req.body.total;
  const game_Id = req.body.game_Id;

  const dumyService = {
    id_renter: req.session.userId,
    id_rented_person: rented_Id,
    id_service: game_Id,
    rental_date: new Date(),
    number_match: number_match,
    price: total,
  };
  Transection.create(dumyService)
  .then((createdUser) => {
    console.log('Thêm vào database thành công:', createdUser);
  })
  .catch((err) => {
    console.error('Lỗi khi thêm vào database:', err);
  }); 
  res.send('done');

  const data = await Renter.find({ _id: req.session.userId});
  data.forEach(user => {
    const newMoney = user.money - total;
    updateMoneyById(req.session.userId, newMoney);
  })
});

module.exports = router;

