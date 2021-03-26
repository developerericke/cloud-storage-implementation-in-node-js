var express = require('express');
var router = express.Router();




/* GET home page. */
router.get('/', function(req, res, next) {


  res.render('index', { title: 'Express' });

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






module.exports = router;

