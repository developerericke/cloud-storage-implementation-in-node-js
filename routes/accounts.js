var express = require('express')
var router = express.Router()
var Tokens = require('csrf')
//var objectID = require('mongodb').ObjectID
let isAuthenticated = function (req,res,next){
     if (req.isAuthenticated()){
          next()

     }else{
          res.redirect('/authenticate')
     }
}
let generateCsrf = function (req,res,next){
     //Create the Csrf and store it In Sessions
     let csrfTokens = new Tokens()
     try{
          var secret = csrfTokens.secretSync()
          var token = csrfTokens.create(secret)
          //save in session Database
          let db = req.app.locals.db
          let table = db.collection('mawingu_sessions')
          let query = {_id:req.sessionID} //{ 'session.passport.user' :objectID((req.user._id)) }
          let new_values = {$set: {'csrf':token}}
          table.updateOne(query,new_values,(error,response)=>{
               if (error) throw error;

          })
          req.csrf = token


          next()
     }catch (e) {
        res.status(500).send("Internal Server Error")
     }

}
router.get('/logout',(req,res,next)=>{
     req.logout()
     res.redirect('/authenticate')
})
router.get('/dashboard',isAuthenticated,generateCsrf,(req,res)=>{

          res.render('accounts',{user:req.user,loggedIn: req.isAuthenticated(),csrf:req.csrf ,systemStatus:200})

})


router.get('/filesmanager',isAuthenticated,generateCsrf,(req,res)=>{
     let folderuser = String(req.user._id)+String(req.user.email).split('@')[0]
     let BASEDIR = require('../app').BaseFiles
     //Fetch all Files and Folders for specific User
     let db = req.app.locals.db
     let table = db.collection('mawingu_folders')
     let users_folders =[]

     let home_folder_items=[{name:'Get Started',downloads:0,size:16*1024,dateCreated:new Date().toLocaleDateString()+'  '+new Date().toLocaleTimeString(),fileowner:folderuser,type:'doc',extension:'doc'}]

     table.find({user:folderuser,folderName:'home'}).toArray((error,documents)=>{
          if(error){
               console.log(error)
          }else{
               //prepare home folder items
               if(documents.length>0){
               home_folder_items= home_folder_items.concat(documents[0].files)
                    }
               //pop item containing home and render the rest of the folders
               table.find({user:folderuser,folderName:{$ne:'home'}}).toArray((error,documents)=>{
                    if(error){
                         console.log(error)
                    }else{
                         users_folders = users_folders.concat(documents)

                         //render the items here
                         res.render('filemanager',{user:req.user,loggedIn: req.isAuthenticated(),csrf:req.csrf ,systemStatus:200,user_folders:users_folders,home_folder_items:home_folder_items})
                    }
               })
          }
     })






})




module.exports = router;