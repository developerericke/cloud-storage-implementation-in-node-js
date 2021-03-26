var express = require('express');
var router = express.Router();
var saltRounds = 10
var bcrypt = require('bcrypt')
var  passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var appjs = require('../app')
var objectId = require('mongodb').ObjectID
let Token = require('csrf')
const  fse = require('fs-extra')
const formidable = require('formidable');

//passport
passport.use(new LocalStrategy(
    function(username, password, done) {
      if (appjs.mydb!==undefined){
        let db = appjs.mydb
        let table = db.collection('mawingu_users')

        table.find({email:username }).toArray(((error, documents) => {

          if (error) {
            return done(error);
          }else{


            if (documents.length===1){

              //Check the credentials
              bcrypt.compare(password,documents[0].password,(error,result)=>{
                if (error){
                  return  done(new Error("Bcrypt Error in comparing passwords"))
                }else{
                  if (result===true){
                    //Password match so authenticate

                    return done(null,documents[0]._id)
                  }else{
                    //password do not match so return an error

                    return done(null, false, { message: 'Invalid Email and Password Combination' });
                  }
                }


              })

            }else{
              //no user has been found

              return done(null, false, { message: 'Invalid username or Password Combination' });
            }
          }
        }))

      }else{

       done(new Error("Failed to Establish Database Connection For Authentication"))
      }

    }
));

//verify csrf
let verifyCSRF = function (req,res,next){


  let csrfToken = req.body.csrf
  let token
  let tokens = new Token()
  if (csrfToken!==undefined || true){

     let db = req.app.locals.db
     let table = db.collection('mawingu_sessions')

     table.find({_id:req.sessionID,csrf:csrfToken}).toArray((error,result)=>{
       if (error) throw  Error("Failed to Fetch csrf from Database")
     try{
       if(csrfToken !== result[0].csrf){
         res.status(401).send("Invalid CSRF token")
       }else{
         next()
       }
     }catch (e) {
       res.status(401).send("Invalid CSRF token")
     }



     })





  }else{
    res.status(401).send("Invalid CSRF token Value")
  }



}

let isAuthenticated = function (req,res,next){
  if(req.isAuthenticated()){
    next()
  }else{
    res.redirect('/authenticate')
  }
}
/* GET users listing. */

let checkQuotaLimit= function (req,res,next){
 let userQuota = req.user.quota

  let maxSize =  1024 * 1024 * 1024 * userQuota
  let db = req.app.locals.db
  let table = db.collection('mawingu_users')



}
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.post('/register',(req,res,next)=>{
  let userFullname = req.body.fullname
  let userEmail = req.body.email
  let userPassword = req.body.password



  let db = req.app.locals.db
  let table = db.collection('mawingu_users')


    //Try and create Home Folder
    //hash user passord if hash fails ,dont save the user
    bcrypt.hash(userPassword, saltRounds, (error, hash) => {
      if (error) {
        res.status(500).send("Internal Server Error")
      } else {

        table.find({email: userEmail}).toArray((error, result) => {
          if (error) {
            res.status(403).send("Internal Server Error")
          } else {
            if (result.length === 0) {
              //add user

              res.status(200).send("Success")
            } else {
              //user Exists
              res.status(403).send('User already Exists')
            }

          }
        })
      }

    })

})


router.post('/login',passport.authenticate('local', { successRedirect: '/accounts/dashboard',
  failureRedirect: '/authenticate?state=failed',
  failureFlash: true })
)

router.post('/updateName',isAuthenticated,verifyCSRF,(req,res,next)=>{
   let newName = req.body.newname

  if (newName!==undefined && newName.length>3 && /[a-zA-z]/.test(newName)===true && /[0-9]/.test(newName)===false){
    let db = req.app.locals.db
    let table = db.collection('mawingu_users')
    if (newName === req.user.fullname){
      res.status(400).send("Please provide a different Fullname different from current one.")

    } else {
      table.updateOne({email: req.user.email}, {$set: {fullname: newName}}, (error, response) => {
        if (error) {
          console.log(error)
          res.status(500).send("Internal Server Error")
        } else {
          if (response.result.nModified === 1) {
            res.status(200).send('success')
          } else {
            res.status(500).send("Internal Server Error")
          }
        }
      })
    }
  }else{
    res.status(400).send("Enter a Valid FullName")
  }
})
router.post('/updateEmail',isAuthenticated,verifyCSRF,(req,res,next)=>{
  let newemail = req.body.newemail
 console.log(newemail)

  if (newemail!==undefined  && newemail.length>3 && /[@]/g.test(newemail)===true && newemail.indexOf('@')>0 && newemail.charAt(newemail.length-1)!== '@' && newemail.charAt(newemail.length-1)!=='.' ) {
    let db = req.app.locals.db
    let table = db.collection('mawingu_users')
    if (req.user.email === newemail){
      //Email value is the same so dont update
      res.status(400).send("Please provide a different email address different from current one.")
    }else{
      table.find({email:newemail}).toArray((error,result)=>
      {
        if (error) {
          console.log(error)
          res.status(500).send("Internal Server Error")
        } else {

          if (result.length === 0) {
            table.updateOne({email: req.user.email}, {$set: {email: newemail}}, (error, response) => {
              if (error) {
                console.log(error)
                res.status(500).send("Internal Server Error")
              } else {
                if (response.result.nModified === 1) {
                  res.status(200).send('success')
                } else {
                  res.status(500).send("Internal Server Error")
                }
              }
            })
          } else {
            res.status(403).send("Email address is already Associated with another Account")
          }

        }
      })
    }




  }else{
    res.status(400).send("Enter a Valid Email Address")
  }
})

router.post('/updatePassword',isAuthenticated,verifyCSRF,(req,res,next)=>{
  let newpassword = req.body.newpassword
  let oldpassword = req.body.oldpassword


  if (newpassword!==undefined  && oldpassword!==undefined && newpassword!==oldpassword ) {
    let db = req.app.locals.db
    let table = db.collection('mawingu_users')

    //compare the user password
    bcrypt.compare(oldpassword,req.user.password,(error,isMatch)=>{
      if (isMatch){
        //Check new password to ensure it is Strong
        if(/[a-zA-Z]/.test(newpassword)===true && /[0-9]/.test(newpassword)===true && newpassword.length>6){
          //Passsword meets the Policy
          bcrypt.hash(newpassword,saltRounds,(error,hash)=>{
            if(error){
              console.log(error)
              res.status(500).send("Internal Server Error")
            }else{
              table.updateOne({email:req.user.email}, {$set: {password:hash}}, (error, response) => {
                if (error) {
                  console.log(error)
                  res.status(500).send("Internal Server Error")
                } else {
                  if (response.result.nModified === 1) {
                    res.status(200).send('success')
                  } else {
                    res.status(500).send("Internal Server Error")
                  }
                }
              })
            }
          })

        }else{
          res.status(400).send("New password too short and weak.Use numbers and letters and ensure the password is at least 6 characters long")
        }

      }else{
        //User provided an incoreect Password
        res.status(403).send("Incorrect Old Password Provided")
      }
    })






  }else{
    res.status(400).send("Enter a Valid Old and New Password")
  }
})

router.post('/new/folder',isAuthenticated,verifyCSRF,(req,res)=>{
  let folderName = req.body.folderName
  let folderPath= req.body.folderPath
//create home folder if it does not exists



  if( /[a-zA-Z]/.test(folderName)===true && folderName!==undefined){
    let db = req.app.locals.db
    let table = db.collection('mawingu_folders')
    folderName = folderName.toLowerCase()
    //folderPath= folderPath.toLowerCase()
    let folderUser = String(req.user._id)+String(req.user.email).split('@')[0]


    let BaseFiles = require('../app').BaseFiles
    let save_path =folderUser+ '\\'+folderName

    fse.ensureDir(BaseFiles+'\\'+save_path).then(()=>{
             functiontoUpdatetoDb()
    }).catch((error,status)=>{
      if(error.code==='EINVAL'){
        res.status(400).send("Folder Name Contains Invalid Characters.Please Enter a valid Name")
      }else{
        res.status(500).send("Internal Server Error")
      }

    })

    let functiontoUpdatetoDb = function (){
      table.find({user:folderUser,folderName:folderName,folderPath:save_path}).toArray((error,documents)=>{
        if(error){
          console.log(error)
          res.status(500).send("Internal Server Error")
        }else{
          console.log(documents)
          if(documents.length===0){
            //Add new
            let folderToDo ={user:folderUser,folderName:folderName,folderPath:save_path,files:[]}
            table.insertOne(folderToDo,(error,response)=>{
              if(error){
                console.log(error)
                res.status(500).send("Internal Server Error")
              }else{
                if(response.insertedCount===1){
                  //
                  res.status(200).send()

                }else{
                  res.status(403).send("Internal Server Error")
                }

              }
            })
          }else{
            res.status(400).send("Folder Already Exists")
          }

        }
      })
    }


  }else{
    //We have some missing Info
    res.status(400).send("Unable to Create a Folder.Please try again later")
  }


})

router.post('/new/file',isAuthenticated,(req,res,next)=>{
 //create home folder if it does not exist and add to db
  try {


    let folderuser = String(req.user._id) + String(req.user.email).split('@')[0]

    let db = req.app.locals.db
    let table = db.collection('mawingu_folders')
    let mybaseFiles = require('../app').BaseFiles
    let save_home_path = mybaseFiles + "\\" + folderuser + '\\' + 'home'
    let folderToDo = {user: folderuser, folderName: 'home', folderPath: save_home_path, files: []}

    function empty_Temp_on_Errors(baseDir, errorMsg) {
      fse.emptyDir(baseDir).then(() => {
        res.status(500).send(errorMsg)

      }).catch((err) => {
        console.log(err)
      })
    }

    table.find({user: folderuser, folderName: 'home'}).toArray((error, result) => {
      if (error) {
        console.log(error)
        res.status(500).send("Internal Server Error")
      } else {
        if (result.length === 0) {
          //create folder for home
          fse.ensureDir(save_home_path).then(() => {
            let folderToDo = {user: folderuser, folderName: 'home', folderPath: save_home_path, files: []}
            table.insertOne(folderToDo, (error, response) => {
              if (error) {
                console.log(error)
                res.status(500).send("Internal Server Error")
              } else {
                upload_and_save_file()

              }
            })

          }).catch((error) => {
            console.log(error)
            res.status(500).send("Internal Server Error")
          })

        } else {
          //call method to handle the file upload
          upload_and_save_file()
        }
      }
    })


    function upload_and_save_file() {

      let folderuser = String(req.user._id) + String(req.user.email).split('@')[0]
      let BASEDIR = require('../app').BaseFiles
      let temp_upload_folder = BASEDIR + '\\' + 'temp' + folderuser + '_temp'
      let maxSize =  500 //500MB
      let user_dir = BASEDIR + '\\' + folderuser
      fse.ensureDir(temp_upload_folder).then(() => {
        const form = formidable({multiples: false, uploadDir: temp_upload_folder, keepExtensions: true});//
        form.maxFileSize = 1024 * 1024 *500
        form.parse(req, (error, fields, files) => {

          if (files.fileUpload !== undefined && fields.fileTitle !== undefined && fields.toFolder !== undefined) {
            let strip_extension = String(files.fileUpload.name).split('.')
            let fileExtension = strip_extension[strip_extension.length - 1]
            let fileName = fields.fileTitle
            let toFolder = String(fields.toFolder).toLowerCase()
            let fileSize = files.fileUpload.size
            let fileType = files.fileUpload.type
            //check fileSize

            let calculatedFile_Size = (fileSize / (1024 * 1024))

            if (calculatedFile_Size > maxSize) {
              //Has exceeded Upload Size
              res.status(400).send("Maximum Upload size allowed is " + maxSize + " MB !")
            } else {
              //Move to folder and Add to Db if succesfull
              let to_move_to

              to_move_to = user_dir + '\\' + String(toFolder).toLowerCase()
              fse.ensureDir(to_move_to).then(() => {
                //Move to root and add to database
                let filesrc = String(files.fileUpload.path)
                let fileDestination = to_move_to + '\\' + fileName + '.' + fileExtension
                //check if file Exists in user folder,If so delete
                fse.pathExists(fileDestination)
                    .then((exists) => {

                      if (exists === true) {
                        //delete
                        fse.remove(fileDestination)
                            .then(() => {
                              fse.move(filesrc, fileDestination).then(() => {
                                //we moved the file ,so append to User Folder
                                table.find({user: folderuser, folderName: toFolder}).toArray((error, result) => {
                                  if (error) {
                                    console.log(error)
                                    empty_Temp_on_Errors(temp_upload_folder, "Internal Server Error")
                                  } else {
                                    //we check if the folder exists,we can only have a single folder
                                    if (result.length === 1) {
                                      let available_folder_files = result[0].files
                                      if (available_folder_files.length > 0) {
                                        available_folder_files.forEach((flItem, index) => {


                                          if (String(flItem.name) == String(fileName)) {
                                            console.log("Replaced an existing")
                                            available_folder_files.splice(index, 1)

                                          }
                                        })

                                      }

                                      let new_folder_files = [{
                                        'name': fileName,
                                        'size': fileSize,
                                        'dateCreated': new Date().toLocaleDateString() + '   ' + new Date().toLocaleTimeString(),
                                        'downloads': 0,
                                        fileowner: folderuser,
                                        'type': fileType,
                                        extension: fileExtension
                                      }]
                                      new_folder_files = new_folder_files.concat(available_folder_files)

                                      //new_folder_files.push()
                                      table.updateOne({
                                        user: folderuser,
                                        folderName: toFolder
                                      }, {$set: {files: new_folder_files}}, (error, response) => {
                                        if (error) {
                                          console.log(error)
                                          empty_Temp_on_Errors(temp_upload_folder, "Internal Server Error")
                                        } else {
                                          //chech updated count
                                          if (response.result.nModified === 1) {
                                            res.status(200).send("Success")
                                          } else {
                                            console.log("Failed to Update")
                                            empty_Temp_on_Errors(temp_upload_folder, "Nothing was updated")
                                          }
                                        }
                                      })
                                    } else {
                                      //we dont have that folder in the first place
                                      empty_Temp_on_Errors(temp_upload_folder, "Folder does not Exist")

                                    }
                                  }
                                })
                              }).catch((error) => {
                                //failed to move
                                console.log(error)
                                res.status(500).send("Failed to move")
                              })
                            })
                            .catch(err => {
                              console.error(err)
                            })
                      } else {
                        fse.move(filesrc, fileDestination).then(() => {
                          //we moved the file ,so append to User Folder
                          table.find({user: folderuser, folderName: toFolder}).toArray((error, result) => {
                            if (error) {
                              console.log(error)
                              empty_Temp_on_Errors(temp_upload_folder, "Internal Server Error")
                            } else {
                              //we check if the folder exists,we can only have a single folder
                              if (result.length === 1) {
                                let available_folder_files = result[0].files
                                if (available_folder_files.length > 0) {
                                  available_folder_files.forEach((flItem, index) => {


                                    if (String(flItem.name) == String(fileName)) {
                                      console.log("Replaced an existing")
                                      available_folder_files.splice(index, 1)

                                    }
                                  })

                                }

                                let new_folder_files = [{
                                  'name': fileName,
                                  'size': fileSize,
                                  'dateCreated': new Date().toLocaleDateString() + '   ' + new Date().toLocaleTimeString(),
                                  'downloads': 0,
                                  fileowner: folderuser,
                                  'type': fileType,
                                  extension: fileExtension
                                }]
                                new_folder_files = new_folder_files.concat(available_folder_files)

                                //new_folder_files.push()
                                table.updateOne({
                                  user: folderuser,
                                  folderName: toFolder
                                }, {$set: {files: new_folder_files}}, (error, response) => {
                                  if (error) {
                                    console.log(error)
                                    empty_Temp_on_Errors(temp_upload_folder, "Internal Server Error")
                                  } else {
                                    //chech updated count
                                    if (response.result.nModified === 1) {
                                      res.status(200).send("Success")
                                    } else {
                                      console.log("Failed to Update")
                                      empty_Temp_on_Errors(temp_upload_folder, "Nothing was updated")
                                    }
                                  }
                                })
                              } else {
                                //we dont have that folder in the first place
                                empty_Temp_on_Errors(temp_upload_folder, "Folder does not Exist")

                              }
                            }
                          })
                        }).catch((error) => {
                          //failed to move
                          console.log(error)
                          res.status(500).send("Failed to move")
                        })
                      }
                    })

              }).catch((e) => {
                console.log(e)
                empty_Temp_on_Errors(temp_upload_folder, 'failed')
              })
              //}


            }


          }
          else if(files.hasOwnProperty('fileUpload')==false) {
              empty_Temp_on_Errors(temp_upload_folder, "Maximum file size allowed is "+maxSize+" MB !")
          }else if(fields.fileTitle === undefined || fields.toFolder === undefined){
              empty_Temp_on_Errors(temp_upload_folder, "Some  Fields are Missing.Please Reload the Page and Try Again !")
          }
          //
        });
        form.on('error', (err) => {
          let str =String(err).search("maxSize")>-1

          //res.status(500).send( "Maximum file size allowed is "+maxSize+" MB !")
          //empty_Temp_on_Errors(temp_upload_folder, "Maximum file size allowed is "+maxSize+" MB !")
        });
        // form.on('progress', (bytesReceived, bytesExpected) => {
        //   let userFileSize = bytesExpected/(1024*1024)
        //   if(userFileSize>maxSize){
        //
        //
        //     empty_Temp_on_Errors(temp_upload_folder, "Maximum file size allowed is "+maxSize+" MB !")
        //     throw new Error (403)
        //
        //   }
        // });
        //
      }).catch((error) => {

        empty_Temp_on_Errors(temp_upload_folder, "Internal Server Error")
      })

    }

  }catch (e) {
    res.status(500).send("Internal Server Error")
  }

  // process.on('uncaughtException', function(err) {
  //   // you can get all uncaught exception here.
  //
  //   res.status(500)
  //   res.write("Internal Sever Error")
  //   res.end()
  // })


})




passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(id, done) {

  let db = appjs.mydb
  let table = db.collection('mawingu_users')

  table.find({_id:objectId(id) }).toArray(((error, documents) => {
     if (error){
       done(error)
     }else{
       if (documents!== undefined || documents.length===1){
         done( null,documents[0]);
       }else{
         done(new Error("Could not deserialize"))
       }


     }
  }))


});

module.exports = router;
