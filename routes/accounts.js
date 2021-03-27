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

router.get('/storagemap',isAuthenticated,(req,res,next)=>{
     let userQuota = req.user.quotaPlan
     //Prepare Usage specifics
     let imageUsage = 0.00
     let videoUsage = 0.00
     let documentUsage =0.00
     let othersUsage =0.00
     let zipUsage = 0.00
     let maxSize =  Number(1024 * 1024 * 1024 * userQuota)
     let db = req.app.locals.db
     let table = db.collection('mawingu_folders')
     let folderuser = String(req.user._id) + String(req.user.email).split('@')[0]
     let occupied = []
     let usedStorage = 0
     table.find({user:folderuser}).toArray((error,documents)=>{
          if(error){
               res.status(500).send("Internal Server Error")
          }else {

               documents.forEach((folder) => {
                    let folderFiles = folder.files
                    folderFiles.forEach((file) => {
                         usedStorage= usedStorage+Number(file.size)

                        let filetype = String(file.type)
                         //file size in GB
                         let fileInGB = Number(file.size)  / (1024 * 1024 * 1024)

                         //check Image
                        if(filetype.search(/image/i)>-1 || filetype.search(/ogg/i)>-1) {
                             imageUsage= imageUsage+ fileInGB
                        }else if(filetype.search(/video/i)>-1){
                             videoUsage = videoUsage + fileInGB
                        }else if(filetype.search(/rar/i)>-1 || filetype.search(/octet-stream/i)>-1 ){
                             zipUsage = zipUsage + fileInGB
                        }else if(filetype.search(/msword/i)>-1 || filetype.search('doc')>-1 || filetype.search(/vnd.openxmlformats-officedocument.wordprocessingml.document/i)>-1){
                             documentUsage = documentUsage+fileInGB
                        }else{
                             othersUsage = othersUsage + fileInGB


                        }

                    })
               })

               //calculate used storage
               let percUsed = 0
               if(usedStorage>0){
                    //
                    usedStorage = (usedStorage /(1024 * 1024 * 1024))
                    percUsed = (usedStorage/5)*100
                    if(percUsed>100){
                         percUsed = 100
                    }
                    if(usedStorage>5){
                         usedStorage = 5
                    }
               }
              othersUsage= othersUsage.toFixed(2)
              imageUsage = imageUsage.toFixed(2)
              videoUsage = videoUsage.toFixed(2)
              zipUsage = zipUsage.toFixed(2)
              documentUsage = documentUsage.toFixed(2)

               let total_usage_check = Number(othersUsage) + Number(imageUsage) + Number(documentUsage) + Number(videoUsage) + Number(zipUsage)
               let extra_storage  =0

               if(total_usage_check>5){
                    extra_storage = (total_usage_check-5)
                    extra_storage = extra_storage.toFixed(2)
                    othersUsage = Number(othersUsage) - Number(extra_storage)
               }

              let prepared_sizeCalculations = {video:videoUsage,image:imageUsage,others:othersUsage,zip:zipUsage,docs:documentUsage}

               res.render('storagemap',{user:req.user,loggedIn: req.isAuthenticated(),csrf:req.csrf ,systemStatus:200,storedItems:occupied,usedStorage:usedStorage,percentageUsage:percUsed,usage:prepared_sizeCalculations})



          }
     })

})



module.exports = router;