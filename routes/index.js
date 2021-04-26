var express = require('express');
var router = express.Router();




/* GET home page. */
router.get('/', function(req, res, next) {


  res.render('index');

});


/* Get Authenticate Pge */
router.get('/authenticate',(req,res,next)=>{


  let flush_error_to_send = []
  let myflasherrors = req.flash('error')
   myflasherrors.forEach((error)=>{
     if(flush_error_to_send.indexOf(error)===-1){
       flush_error_to_send.push(error)
     }
   })
  res.render('authenticate',{message:flush_error_to_send.join('.<br>')})
})

router.get('/download/',(req,res)=>{

    let owner = req.query.owner
    let folder = req.query.folder
    let file = req.query.file
    let BaseFiles = require('../app').BaseFiles

    if(owner!==undefined && folder!==undefined && file!==undefined){
        if( folder===String(folder).toLowerCase() && file === 'Get Started with Mawingu'){
            let tosendFile = BaseFiles+'\\'+'GetStarted'+"\\"+'welcome.pdf'
            res.sendFile(tosendFile)

        }else{
            folder = folder.toLowerCase()
            let db = req.app.locals.db
            let table = db.collection('mawingu_folders')

            table.find({user:owner,folderName:folder}).toArray((error,documents)=>{
                if(error){

                    res.status(500).send("Internal Server Error")
                }else{

                    if(documents.length===1){
                        let old_files = documents[0].files
                        let oldPath = documents[0].folderPath
                        let new_files = []
                        old_files.forEach((o_file)=>{
                            if(String(o_file.name)=== String(file)){
                                //we found a matching one
                                new_files.push({
                                    name: o_file.name,
                                    size: o_file.size,
                                    dateCreated: o_file.dateCreated,
                                    downloads: Number(o_file.downloads)+1,
                                    fileowner: o_file.fileowner,
                                    type: o_file.type,
                                    extension: o_file.extension
                                })
                                oldPath=oldPath +'\\'+ String(o_file.name)+'.'+String(o_file.extension)
                            }else{
                                new_files.push(o_file)
                            }
                        })

                        table.updateOne({user:owner,folderName:folder},{$set:{files:new_files}},(error,response)=>{
                            if(error){
                                res.status(500).send("Internal Server Error")
                            }else{
                                if(response.result.nModified===1){
                                    let downloadPath =  oldPath //BaseFiles +'\\'+
                                    res.sendFile(downloadPath)
                                }else{
                                    res.status(500).send("Internal Server Error")
                                }
                            }
                        })


                    }else{
                        res.status(404).send(" FILE NOT FOUND")
                    }
                }
            })
        }

    }else{
        res.status(404).send(" FILE NOT FOUND")
    }


})




module.exports = router;

