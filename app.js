
express=require('express');
const multer=require('multer');
cors=require('cors')
app=express();
bodyParser=require('body-parser');
const mongoose=require('mongoose');
mongoose.connect('mongodb://localhost:27017/voting_system')
const fs=require('fs')
const axios=require("axios");
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const passportLocal=require('passport-local');
const session=require('express-session');
const jwt=require("jsonwebtoken")

///upload files
fs.mkdir("./uploaded",(err)=>{if(err){}} )
upload=multer({dest:"./uploaded"})


//security
access_token_secret="secret"
refresh_token_secret="refreshsecret"
secret_api=" http://127.0.0.1:8000/api"


app.use(session({
    secret:"hello",
    resave:false,
    saveUninitialized:false
  }));
  app.use(passport.initialize());
  app.use(passport.session());

//set server and database
app.use(express.json())
app.use(express.static('public'))
app.use(cors())


userSchema=mongoose.Schema({
    username:String,
    phone:String,
    face_encoding:[Number],
    birthday:Date,
    first_name:String,
    last_name:String


    
})
userSchema.plugin(passportLocalMongoose);

userModel=mongoose.model('user',userSchema);


passport.use(userModel.createStrategy());
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());


candidates=mongoose.Schema({
    name:String,
    bio:String,
    votes:Number
})

running_votes_schema=mongoose.Schema({
    title:String,
    candidates:[candidates],
    startTime:Date,
    endTime:Date,
    reigon:String
})
running_votes_collection=mongoose.model('running_vote',running_votes_schema);
// tests

// currentTime=new Date()
// endTime=new Date()
// endTime=endTime.setHours(endTime.getHours()+1000)

// vote=new running_votes_collection({
//    "title":"science2",
//     "candidates":[{ "name":"einstien",
//     "bio":"special relativity",
//     "votes":0},{ "name":"stephen hawking",
//     "bio":"black holes",
//     "votes":0},{ "name":"el khawarzmi",
//     "bio":"created algebra",
//     "votes":0}],
//     "startTime":currentTime,
//     "endTime":endTime,
//     "reigon":"Bahia"
// })
// vote.save()


submitted_votes_schema=mongoose.Schema({
    title:String,
    voterName:String,
    chosenCandidate:String,
    time:Date,
    verification_code:String

})
submitted_votes_collection=mongoose.model('submitted_vote',submitted_votes_schema);

tokens_schema=mongoose.Schema({
  stored_token:String,
  end_time:Date
})

tokens_collection=mongoose.model('token_collection',tokens_schema)



// function authentication(req,res){
//   if(req.isAuthenticated()){
//     res,send("authenticated")
//   }
//   else{
// res.send("login")
//   }
// }




//////////////////////jwt ,login and authentication
app.get("/",authenticateToken,(req,res)=>{
  user=req.user
  if (user==undefined){res.send("refresh token")}
  else{res.send(user.name+" success")}
    
})


app.route("/register")
.post(async (req,res)=>{
    let redirect=await userModel.register({username:req.body.username.trim(),phone:req.phone,first_name:req.body.first_name,last_name:req.body.last_name,birthday:req.body.birthday},req.body.password,(err,user)=>{
        if(err){console.log(err) ;res.send("failed")}
        else{
          passport.authenticate("local")(req,res,()=>{
            res.send("success");
          })
      }
      })
  })

app.route("/login")
.post(async (req,res)=>{ 
    let redirect =await  passport.authenticate("local",(err,user,info)=>{
        if(err){console.log(err)}
        if(!user){res.send("error")}
        else{
          req.login(user,err=>{
            if(err){console.log(err)}
            else{
                        ///successful authentication 
                    const username=req.body.username
                    const user={name:username}
                    const accessToken=generateToken(user)
                    const refreshToken=jwt.sign(user,refresh_token_secret)
                    created_time=new Date()
                    save_token=new tokens_collection({"stored_token":refreshToken,"end_time":created_time.setHours(created_time.getHours()+1)})
                    save_token.save()

                    res.json({accessToken:accessToken,refreshToken:refreshToken})




            }
          })
        }
      })(req,res);
  })

function authenticateToken(req,res,next){
const authHeader=req.headers["authorization"]
const token=authHeader&&authHeader.split(' ')[1]
if(token==null){res.send("401")}
jwt.verify(token,access_token_secret,(err,user)=>{
    if(err){res.send("403")}
    else{
    req.user=user
    next()}
})
}

function generateToken(user){
  return accessToken=jwt.sign(user,access_token_secret,{expiresIn:"15s"}) /// change this
}
app.post("/token",(req,res)=>{
  const refreshToken=req.body.token
  if(refreshToken==null){res.send("401")}
  else{
    refreshTokens=tokens_collection.findOne({"stored_token":refreshToken}).then((result,err)=>{
      if(result!= null){
    if(err){res.send("401")}
    else{
      result=result.stored_token
     
      jwt.verify(result,refresh_token_secret,(err,user)=>{
        if(err){res.send("401")}
        else{const accessToken=generateToken({name:user.username});
      res.json({"accessToken":accessToken})}
      })

    }
      }
      else{res.send("401")}
  
  })
  }
  

})


app.delete("/logout",(req,res)=>{

  token=req.body.token
  tokens_collection.deleteOne({"stored_token":token}).then((result)=>{
    res.send("success")
  })


  
})

/////////////////////////////end autentication

app.route("/reigons")
.get(authenticateToken,(req,res)=>{
  running_votes_collection.find().select(['reigon']).then((results,err)=>{
    res.json(results)
  })
} )

.post(authenticateToken,(req,res)=>{
  running_votes_collection.findOne({"_id":req.body.reigon_id}).then((result,err)=>{
    if(err){console.log(err)}
    else{
      res.send(result)}
  })
})


app.route("/cpf")

.post(authenticateToken,(req,res)=>{
try{
axios.post(secret_api+"/validate%20cpf/",{"cpf":req.body.cpf}).then((result)=>{
  res.send(result.data.toLowerCase())
  
})
}
catch(err){res.send("error")}
})

port=2000;
app.listen(port,console.log("hello from port"+port))