//Runs tests for all services in the network.
//By default it will run a full test, truncating all the
//patient tuples in the database directly.
//From there it runs a series of operations to
//add patients, randomly update various fields, getting
//random patients, and finishes by deleting patients randomly.

const TEST_NAME = "TEST_DATA.json"

const fs = require('fs')
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ADD_FLAG = '-a'
const GET_FLAG = '-g'
const PATCH_FLAG = '-p'
const DEL_FLAG = '-d'
const TRUNCATE_FLAG = '-resetDB'
const ACCEPT_TRUNCATE = '-y'
const TRUNCATE_TRACES_FLAG = '-resetTraces'

const STATES = 
    "AA|AE|AK|AL|AP|AR|AS|AZ|CA|CO|CT|DE|DC|FL|FM|GA|GU|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MH|MI|MN|MO|MP|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|PR|PW|RI|SC|SD|TN|TX|UM|UT|VA|VI|VT|WA|WI|WV|WY"
    .split('|');
const ICD10_CODES = 
    "S29021A|S82234A|W1691XD|T24522D|T20312A|S72461D|H04149|S99019G|Z91130|J958|S00229|S82861K|V427|Y387X3A|T65221|S0550XD|V9354XD|S60945A|S52379J|S93325S|S60944S|S61429|Z7709|H53439|S2699XA|S63239|T8169XS|S65011|S32001K|E70331|S62251S|S60446A|M84534|F80|S2520XA|S62015P|S225XXK|M05549|M95|W5902XD|T6094XD|T508X5D|S66320S|X501XXS|S48922S|S62340B|L89200|R861|T22299|S65401D"
    .split('|')
    const SEX = ['M', 'F']

const RANDOM_RUNS = 30;

//Patients from the TEST file which should not already be in the DB.
const testPatients = JSON.parse(fs.readFileSync(TEST_NAME));

//Make a request with Fetch.
//Provided HTTP method, along with headers and body contents, will be included.
fetchRequest = (url, httpMethod, reqHeaders, reqBody) => {
    //console.log("REQUEST", reqBody)
    return new Promise((resolve, reject) => { 
        fetch(url, {
            method: httpMethod,
            headers: reqHeaders,
            body: JSON.stringify(reqBody)
        }, reject)
        .then(res => res.text())
        .then(body => resolve(body))
    })
}

//Generate random numbers in the range.
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function main() {
    console.log("WARNING! Be sure the database has content first!")
    console.log("Run `node init_Database.js if you're not sure.")

    if (process.argv.includes(TRUNCATE_FLAG)) {
        truncateAll()
    } else if (process.argv.includes(TRUNCATE_TRACES_FLAG)) {
        truncateAllTraces()
    } else {
        //Commands are accepted in order of precedents; add, get, patch, delete.
        if (process.argv.includes(ADD_FLAG)) {
            console.log("Adding patients from file...")
            addPatients()
        }
        if (process.argv.includes(GET_FLAG)) {
            console.log("Fetching patients randomly with SSNs and names...")
            getPatients()
        }
        if (process.argv.includes(PATCH_FLAG)) {
            console.log("Patching patients randomly with phones, sexes, states and diagnoses.")
            patchPatients()
        }
        if (process.argv.includes(DEL_FLAG)) {
            console.log("Deleting patients randomly with names and SSNs.")
            delPatients()
        }
    }
}

//Add patients independently.
async function addPatients() {
    urlA = " http://localhost:5000/addP";
    method = "POST";
    requests = [];

    for (curPatient of testPatients) {
        myHeaders = {'Content-Type': 'application/json'}
        myBody = {
            fname : curPatient.name,
            sname : curPatient.surname,
            ssn   : curPatient.ssn,
            pNum  : curPatient.phoneNum,
            sex   : curPatient.sex,
            diag  : curPatient.diagnosis,
            stCod : curPatient.state
        }
        //console.log(curPatient)
        //console.log(myBody)

        requests.push(
            fetch(urlA, {
                method: method,
                headers: myHeaders,
                body: JSON.stringify(myBody)
            }).then(r => r.json())
        );
    }

    Promise.all(requests)
        .then((resps) => {
            for (const resp of resps) {
                console.log(resp);
            }
        })


}

//Randomly pull patients by name and SSN.
async function getPatients() {
    urlA = " http://localhost:5000/getPname";
    urlB = " http://localhost:5000/getPssn";
    method = "GET";
    requests = [];

    //Get a random patient from the testing data.
    //Then pick whether to retrieve by name or SSN.
    for (i = 0; i < RANDOM_RUNS; i += 1) {
        patient = testPatients[Math.floor(Math.random() * testPatients.length)];
        isSSN = (randomNumber(0, 2) === 0)
        //console.log(isSSN)
        //console.log(patient)

        myHeaders = {}

        if (isSSN) {
            myHeaders.ssn = patient.ssn
            requests.push(
                fetch(urlB, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );
        } else {
            myHeaders.fname = patient.name,
            myHeaders.sname = patient.surname
            requests.push(
                fetch(urlA, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );
        }        
    }

    Promise.all(requests)
        .then((resps) => {
            for (const resp of resps) {
                console.log(resp);
            }
        })

        
}

//Randomly patch patients with information from the MOCK and TEST json files.
async function patchPatients() {
    urlA = "http://localhost:5000/updPphone";
    urlB = "http://localhost:5000/updPstCod";
    urlC = "http://localhost:5000/updPdiag";
    urlD = "http://localhost:5000/updPsex";
    method = "PATCH";
    requests = [];

    console.log(ICD10_CODES)

    for (i = 0; i < RANDOM_RUNS; i += 1) {
        patient = testPatients[Math.floor(Math.random() * testPatients.length)];
        choice = randomNumber(0, 4);
        myHeaders = {
            fname : patient.name,
            sname : patient.surname
        }
        if (choice === 0) {         //Phone
            //Make a random phone number
            number = 
                randomNumber(201, 990)
                + "-" + randomNumber(200, 999)
                + "-" + randomNumber(1000, 9999)
            console.log(number)
            myHeaders.pNum = number
            requests.push(
                fetch(urlA, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );

        } else if (choice === 1) {  //state code
            state = STATES[Math.floor(Math.random() * STATES.length)];
            console.log(state)
            myHeaders.stCod = state
            requests.push(
                fetch(urlB, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );

        } else if (choice === 2) {  //diagnosis code
            diagnosis = ICD10_CODES[Math.floor(Math.random() * ICD10_CODES.length)];
            console.log(diagnosis)
            myHeaders.diag = diagnosis
            requests.push(
                fetch(urlC, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );
            
        } else {                    //sex
            sex = SEX[Math.floor(Math.random() * SEX.length)];
            console.log(sex)
            myHeaders.sex = sex
            requests.push(
                fetch(urlD, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );

        }
    }

    
    Promise.all(requests)
        .then((resps) => {
            for (const resp of resps) {
                console.log(resp);
            }
        })

}

//Randomly delete patients according to MOCK and TEST json files.
async function delPatients() {
    urlA = "http://localhost:5000/delPname";
    urlB = "http://localhost:5000/delPssn";
    method = "DELETE";
    requests = [];

    //Get a random patient from the testing data.
    //Then pick whether to delete by name or SSN.
    for (i = 0; i < (RANDOM_RUNS / 2); i += 1) {
        patient = testPatients[Math.floor(Math.random() * testPatients.length)];
        isSSN = (randomNumber(0, 2) === 0)
        //console.log(isSSN)
        //console.log(patient)

        myHeaders = {}

        if (isSSN) {
            myHeaders.ssn = patient.ssn
            requests.push(
                fetch(urlB, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );
        } else {
            myHeaders.fname = patient.name,
            myHeaders.sname = patient.surname
            requests.push(
                fetch(urlA, {
                    method: method,
                    headers: myHeaders
                }).then(r => r.json())
            );
        }        
    }

    Promise.all(requests)
        .then((resps) => {
            for (const resp of resps) {
                console.log(resp);
            }
        })

        

}

//Truncate the patient table; reset everything.
async function truncateAll() {
    if (process.argv.includes(ACCEPT_TRUNCATE)) {
        console.log("Resetting patient database...")
        await prisma.patient.deleteMany({});
        console.log("...done.")
    } else {
        console.log("Note the 'resetDB' command wipes the ENTIRE patient database.")
        console.log("All patient data (but not traces of any kind) will be lost.")
        console.log("This is useful for repeated testing.")
        console.log("If you're really sure, include...\n")
        console.log("-y\n")
        console.log("...with " + TRUNCATE_FLAG + " the next time you run this command.")
    }
}

//Truncate all trace tables, effectively nuke the DB.
//Run this when you want to start a new testing session.
async function truncateAllTraces() {
    if (process.argv.includes(ACCEPT_TRUNCATE)) {
        console.log("Resetting traces database, here goes everything...")
        await prisma.traceRecord.deleteMany({});

        //Now for the tables we can't do this with.
        await prisma.serviceAnalysisRecord.deleteMany({});
        await prisma.serviceTopsisScores.deleteMany({});
        await prisma.pathAnalysisRecord.deleteMany({});
        console.log("...done.")
    } else {
        console.log("This command will erase ALL the traces in the database!")
        console.log("If you do not recover the trace data then it will be GONE!")
        console.log("Make sure you do any testing you need before you try this!")
        console.log("If you're really sure, include...\n")
        console.log("-y\n")
        console.log("...with " + TRUNCATE_TRACES_FLAG + " the next time you run this command.")
    }
}

main();