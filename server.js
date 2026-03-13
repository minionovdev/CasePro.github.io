const express = require("express")
const mongoose = require("mongoose")
const session = require("express-session")
const passport = require("passport")
const SteamStrategy = require("passport-steam").Strategy
const http = require("http")
const socket = require("socket.io")
const crypto = require("crypto")

const app = express()
const server = http.createServer(app)
const io = socket(server)

mongoose.connect("mongodb://127.0.0.1/casebattle")

app.use(express.json())
app.use(express.static("public"))

app.use(session({
 secret:"secret",
 resave:false,
 saveUninitialized:true
}))

app.use(passport.initialize())
app.use(passport.session())

const User = mongoose.model("User",{
 steamId:String,
 nickname:String,
 avatar:String,
 balance:{type:Number,default:1000},
 inventory:Array
})

const Case = mongoose.model("Case",{
 name:String,
 price:Number,
 image:String,
 items:Array
})

passport.use(new SteamStrategy({
 returnURL:"http://localhost:3000/auth/steam/return",
 realm:"http://localhost:3000/",
 apiKey:"STEAM_API_KEY"
},
async(identifier,profile,done)=>{

 let user=await User.findOne({steamId:profile.id})

 if(!user){
 user=await User.create({
 steamId:profile.id,
 nickname:profile.displayName,
 avatar:profile.photos[2].value
 })
 }

 return done(null,user)
}))

passport.serializeUser((user,done)=>done(null,user.id))
passport.deserializeUser(async(id,done)=>{
 const user=await User.findById(id)
 done(null,user)
})

app.get("/auth/steam",passport.authenticate("steam"))

app.get("/auth/steam/return",
 passport.authenticate("steam",{failureRedirect:"/"}),
 (req,res)=>res.redirect("/")
)

app.get("/api/user",(req,res)=>{
 res.json(req.user||null)
})

function provablyFair(serverSeed,clientSeed,nonce){
 const hash=crypto
 .createHash("sha256")
 .update(serverSeed+clientSeed+nonce)
 .digest("hex")

 const roll=parseInt(hash.substring(0,8),16)/0xffffffff

 return roll
}

app.get("/api/cases",async(req,res)=>{
 const cases=await Case.find()
 res.json(cases)
})

app.post("/api/open",async(req,res)=>{

 if(!req.user) return

 const user=await User.findById(req.user._id)
 const gameCase=await Case.findById(req.body.caseId)

 if(user.balance<gameCase.price) return

 user.balance-=gameCase.price

 const serverSeed="server-secret"
 const clientSeed="client"
 const nonce=Date.now()

 const roll=provablyFair(serverSeed,clientSeed,nonce)

 let total=0
 let item

 for(const i of gameCase.items){
 total+=i.chance
 if(roll<=total){
 item=i
 break
 }
 }

 user.inventory.push(item)

 await user.save()

 res.json(item)

})

app.post("/api/sell",async(req,res)=>{

 const user=await User.findById(req.user._id)

 const item=user.inventory[req.body.index]

 user.balance+=item.price

 user.inventory.splice(req.body.index,1)

 await user.save()

 res.json({balance:user.balance})

})

app.get("/api/inventory",async(req,res)=>{

 const user=await User.findById(req.user._id)

 res.json(user.inventory)

})

io.on("connection",(socket)=>{

 socket.on("battle:create",(data)=>{
 io.emit("battle:new",data)
 })

})

server.listen(3000,()=>{
 console.log("Server started")
})
