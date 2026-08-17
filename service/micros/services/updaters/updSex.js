/**
 * Update specified patient field. If a patient does not exist return a warning.
 * 
 * When fired, should check to see if a patients name combination can be found in the database.
 * This takes user input and should be flagged appropriately.
 * 
 */
//This constant is used for several names, ensure it matches something in the config or Bad Things will happen!
const MY_NAME_IS = "updSex"
const FILTER_WITH = "sex"

//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { PrismaClient } = require('@prisma/client');

//---Configuration; port, prisma where relevant...---//
const config = require('config');
const prisma = new PrismaClient();
const HOST = config.get('host');
const PORT = config.get('ports.micros.updaters.' + MY_NAME_IS);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Works by name.
const URLForFilter = 'http://' + HOST + ':' + config.get('ports.micros.filters.' + FILTER_WITH)

/**
 * POST contents from the specified URL and return them.
 * args is a JSON containing any necessary arguments (body only)
 */
const postToUrl = (url, args) => {
  return new Promise((resolve, reject) => { 
    fetch(url, {
      method: "post",
      headers : {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        args
      )
    }, reject)
    .then(res => res.text())
    .then(body => resolve(body))
  })
}

//--Start the service listening on the port. Required for all.--//
app.listen(PORT, () => {
    console.log(`Listening for requests on http://${HOST}:${PORT}`);
  });


app.patch('/', async (req, res) => {
    //fetch data running from second service
    //tracer.startActiveSpan (MY_NAME_IS, async (span) => {
        console.log("Recieved PATCH on" + MY_NAME_IS)

        console.log("headers: ", req.headers)
        console.log("body: ", req.body)

        body = req.body

        console.log(req.body)
        resultant = {}
        //console.log(headers, "itemCount: ", Object(headers).length)
        console.log(body.fname)
        console.log(body.sname)
        console.log(body.sex)
        toPatch = (body.sex)

        //don't even bother if the given value isn't good
        isValid = JSON.parse(await postToUrl(URLForFilter, {"check" : toPatch})).content
        success = isValid;
        if (isValid) {

          try {
            //actually patch.
            resultant = await prisma.patient.update({
              where: {
                name_surname : {
                  name    : body.fname,
                  surname : body.sname
                }
              },
              data: {
                  sex : body.sex
              }
            })
          } catch (error) {
            res.statusCode = 500;
            console.log(error)
            success = false;
            resultant = {"Error" : "Tried to update a patient that doesn't exist!"}
          }
        } else {
          success = false;
          resultant = {"Error" : "Tried to update but missing parameters!"}
        }

        const rB = req.body
        console.log(rB)
        res.type('json')
        res.send({
            "success" : success,
            "content" : resultant
        })
})
