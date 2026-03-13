const casesDiv=document.getElementById("cases")
const roulette=document.getElementById("items")

async function loadUser(){

 const res=await fetch("/api/user")
 const user=await res.json()

 if(user){
 document.getElementById("balance").innerText="Balance: "+user.balance
 }

}

async function loadCases(){

 const res=await fetch("/api/cases")
 const cases=await res.json()

 casesDiv.innerHTML=""

 cases.forEach(c=>{

 const el=document.createElement("div")
 el.className="case"

 el.innerHTML=`
 <img src="${c.image}" width="150">
 <h3>${c.name}</h3>
 <p>${c.price} ₽</p>
 <button onclick="openCase('${c._id}')">Open</button>
 `

 casesDiv.appendChild(el)

 })

}

async function openCase(id){

 roulette.innerHTML=""

 for(let i=0;i<40;i++){

 const div=document.createElement("div")
 div.className="item"
 div.innerText="?"

 roulette.appendChild(div)

 }

 const res=await fetch("/api/open",{
 method:"POST",
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({caseId:id})
 })

 const item=await res.json()

 const items=document.querySelectorAll(".item")

 items[35].innerText=item.name

 roulette.style.transform="translateX(-4200px)"

 setTimeout(()=>{
 alert("You won "+item.name)
 },3200)

}

loadUser()
loadCases()
