/*********************************************************************************
* BTI325 – Assignment 5
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: Alexander Banigan Student ID: 151167202 Date: 2022-11-27
*
* Online (Heroku Cyclic) Link: https://witty-fox-earmuffs.cyclic.app/
*
********************************************************************************/ 
var dataservice = require('./data-service.js');
var dataserviceAuth = require('./data-service-auth.js');
var express = require("express");
var app = express();
app.use(express.static('public'));
var path = require("path");
var multer = require("multer");
var fs = require('fs');
var exphbs = require('express-handlebars');
const Sequelize = require('sequelize');
var sequelize = new Sequelize('ztrcubfn', 'ztrcubfn', 'rOvBGIdYfctJ6-Jqdiy6tYttCvTqMe0S', {
    host: 'peanut.db.elephantsql.com',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    },
    query: { raw: true }
});
var clientSessions = require("client-sessions");
app.use(clientSessions({
    cookieName: "session",
    secret: "Let'sPlayJazzPianoVolume3",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60
}));
function ensureLogin(req, res, next) {
    if (!req.session.user) {
      res.redirect("/login");
    } else {
      next();
    }
  }
app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
   });
sequelize
    .authenticate()
    .then(function() {
        console.log('Connection success.');
    })
    .catch(function(err) {
        console.log('Unable to connect to DB.', err);
    });

app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options){
            return '<li' +
            ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
            '><a href=" ' + url + ' ">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
            return options.inverse(this);
            } else {
            return options.fn(this);
            }
        }
    }
}));

app.set('view engine', '.hbs');

app.use(function(req,res,next){
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
});


const imagesArray = {images: ""};

const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({storage : storage});

app.use(express.json());
app.use(express.urlencoded({extended: true}));

var HTTP_PORT = process.env.PORT || 8080;

function onHttpStart(){
    console.log("Express http server listening on: " + HTTP_PORT);
}

app.get("/", function(req, res){
    res.render('home');
})

app.get("/about", function(req, res){
    res.render('about');
})
// employee routes
app.get("/employees", ensureLogin, function(req, res) {
    if (req.query.status) {
        dataservice.getEmployeesByStatus(req.query["status"]).then(function(statusEmployee) {
            res.render("employees", {employees: statusEmployee});
        }).catch(function(error) {
            res.render("employees",{message: error});
        })
    }
    else if (req.query.department) {
        dataservice.getEmployeesByDepartment(req.query["department"]).then(function(departmentEmployee) {
            res.render("employees", {employees: departmentEmployee});
        }).catch(function(error) {
            res.render("employees",{message: error});
        })
    }
    else if (req.query.manager) {
        dataservice.getEmployeesByManager(req.query["manager"]).then(function(managerEmployee) {
            res.render("employees", {employees: managerEmployee});
        }).catch(function(error) {
            res.render("employees",{message: error});
        })
    }
    else {
        dataservice.getAllEmployees().then(function(employees) {
            if (employees.length > 0){
                res.render("employees", {employees: employees});
            }
            else {
                res.render("employees", {message: "no results"});
            }
        }).catch(function(error) {
            res.render("employees",{message: error});
        });
    }
})
app.get("/employees/add", ensureLogin, function(req, res) {
    dataservice.getDepartments().then(function(data){
        res.render("addEmployee", {departments: data});
    }).catch(function() {
        res.render("addEmployee", {departments: []});
    })
    
})
app.post("/employees/add", ensureLogin, function(req, res) {
    dataservice.addEmployee(req.body).then(function() {
        res.redirect("/employees");
    }).catch(function(error){
        res.json(error);
    });
})
// app.get("/employee/:value", function(req, res) {
//     dataservice.getEmployeeByNum(req.params.value).then(function(employee) {
//         res.render("employee", {employee: employee});
//     }).catch(function(error) {
//         res.render("employee",{message: error});
//     })
// })
app.get("/employee/:empNum", ensureLogin, (req, res) => {
    // initialize an empty object to store the values
    let viewData = {};
    dataservice.getEmployeeByNum(req.params.empNum).then((data) => {
    if (data) {
    viewData.employee = data; //store employee data in the "viewData" object as "employee"
    } else {
    viewData.employee = null; // set employee to null if none were returned
    }
    }).catch(() => {viewData.employee = null; // set employee to null if there was an error
    }).then(dataservice.getDepartments).then((data) => {
        viewData.departments = data; // store department data in the "viewData" object as "departments"
    // loop through viewData.departments and once we have found the departmentId that matches
    // the employee's "department" value, add a "selected" property to the matching
    // viewData.departments object
        for (let i = 0; i < viewData.departments.length; i++) {
            if (viewData.departments[i].departmentId == viewData.employee.department) {
                viewData.departments[i].selected = true;
            }
        }
        }).catch(() => { viewData.departments = []; // set departments to empty if there was an error
        }).then(() => { if (viewData.employee == null) { // if no employee - return an error
            res.status(404).send("Employee Not Found");
        } 
            else {
            res.render("employee", { viewData: viewData }); // render the "employee" view
            }
    });
});
app.get("/employee/delete/:empNum", ensureLogin, function(req, res) {
    dataservice.deleteEmployeeByNum(req.params.empNum).then(function() {
        res.redirect("/employees");
        }).catch(function() {
            res.status(500).send("Unable to Remove Employee / Employee not found");
    })
});
app.post("/employee/update", ensureLogin, (req, res) => {
    console.log(req.body);
    dataservice.updateEmployee(req.body).then(function() {
        res.redirect("/employees");
    }).catch((err)=>{
        res.status(500).send("Unable to Update Employee");
       });
});
// department routes
app.get("/departments", ensureLogin, function(req, res) {
    dataservice.getDepartments().then(function(departments) {
        if (departments.length > 0) {
            res.render("departments", {departments: departments})
        }
        else {
            res.render("departments", {message: "no results"})
        }
    }).catch(function(error) {
        res.render("departments",{message: error});
    });
})
app.get("/departments/add", ensureLogin, function(req, res) {
    res.render('addDepartment');
})
app.post("/departments/add", ensureLogin, function(req, res) {
    dataservice.addDepartment(req.body).then(function() {
        res.redirect("/departments");
    }).catch((err)=>{
        res.status(500).send("Unable to Add Department");
       });
})
app.post("/department/update", ensureLogin, function(req, res) {
    console.log(req.body);
    dataservice.updateDepartment(req.body).then(function() {
        res.redirect("/departments");
    }).catch((err)=>{
        res.status(500).send("Unable to Update Department");
       });
})
app.get("/department/:value", ensureLogin, function(req, res) {
    dataservice.getDepartmentById(req.params.value).then(function(department) {
        if (department == null) {
            res.status(404).send("Department Not Found");
        }
        res.render("department", {department: department});
    }).catch(function() {
        res.status(404).send("Department Not Found");
    })
})
// image routes
app.get("/images/add", ensureLogin, function(req, res) {
    res.render('addImage');
})
app.post("/images/add", ensureLogin, upload.single("imageFile"), (req, res) => {
    res.redirect("/images");
})
app.get("/images", ensureLogin, function(req, res) {
    fs.readdir("./public/images/uploaded", function(err, items) {
        if (err) {
            reject("Failure to read file");
        }
        else {
            imagesArray.images = JSON.stringify(items);
            res.render("images", {imagesList: items});
        }
    })
    
})
// user login/logout/register/history routes
app.get("/login", function(req, res) {
    res.render('login');
})
app.get("/register", function(req, res) {
    res.render('register');
})
app.post("/register", function(req, res) {
    dataserviceAuth.registerUser(req.body).then(function(){
        res.render('register', {successMessage: "User created"});
    }).catch(function(err){
        res.render('register', {errorMessage: err, userName: req.body.userName});
    });
})
app.post("/login", function(req, res) {
    req.body.userAgent = req.get('User-Agent');
    dataserviceAuth.checkUser(req.body).then(function(userData) {
        req.session.user = {
            userName: userData.userName, // complete it with authenticated user's userName
            email: userData.email, // complete it with authenticated user's email
            loginHistory: userData.loginHistory // complete it with authenticated user's loginHistory
        }
        res.redirect('/employees');
    }).catch(function(err) {
        res.render('login', {errorMessage: err, userName: req.body.userName});
    });
})
app.get("/logout", (req, res)=>{
    req.session.reset();
    res.redirect("/login");
});
app.get("/userHistory", ensureLogin, function(req, res){
    res.render('userHistory');
});

app.use((req, res)=> {
    res.status(404).send("Page not found");
})

dataservice.initialize()
.then(dataserviceAuth.initialize)
.then(function(){
 app.listen(HTTP_PORT, function(){
 console.log("app listening on: " + HTTP_PORT)
 });
}).catch(function(err){
 console.log("unable to start server: " + err);
});

