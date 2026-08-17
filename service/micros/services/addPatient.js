/**
 * Add a patient to the database with all their feaatures.
 * 
 * Be sure to check if patient exists first.
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "addPatient"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const { PrismaClientKnownRequestError } = require("@prisma/client/runtime/library");
const { PrismaClient } = require(".prisma/client");
const HOST = config.get('host');
const PORT = config.get('ports.micros.services.' + MY_NAME_IS);

const app = express();
const prisma = new PrismaClient
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
  });


//DEBUG to ensure port allocation is working properly.
app.post('/', async (req, res) => {
    /*
    Add a new patient
    given fname, lname, ssn, pnum, stcod, sex, diag

    we do not check if the values are good - single responsibility
    */
    console.log("Recieved POST on" + MY_NAME_IS)
    const rB = req.body
    console.log(rB)


    console.log(rB.fname, rB.sname, rB.ssn, rB.pNum, rB.diag, rB.stCod, rB.sex)

    //affordance to guarantee valid input.
    //Numbers <= 20 cannot generate in order to ensure no conflicts with test data.
    pID = Math.floor((Math.random() * 1000000) + 21);
    
    toAdd = {
        patient_id : pID,
        name : rB.fname,
        surname : rB.sname,
        ssn : rB.ssn,
        phoneNum : rB.pNum,
        diagnosis : rB.diag,
        state : rB.stCod,
        sex : rB.sex
    }

    try {
        resultant = await prisma.Patient.create({
            data: toAdd
        })
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            res.statusCode = 400;
            if (error.code === 'P2002') {
                resultant = "A patient with that name/SSN already exists in the database."
            } else {
                res.statusCode = 500;
                console.log(error)
                resultant = "Unknown error. Check console."
            }
        }
    }


    response = {
        "content": resultant
    }

    res.type('json')
    res.send({
        "success" : "true",
        "content" : resultant
    })
})
