/**
 * API FRONTEND
 * 
 * This is the front-facing API of the service to ensure there is a standard
 * way of contacting the microservices. It IS NOT a microservice in and of itself, but
 * it can begin tracing contexts.
 */
const MY_NAME_IS = "API"
//const setupTracing = require('tracer.js');
//const tracer = setupTracing('I-AM-THE-FRONTEND');
//Boilerplate code used for each service. Required for decoupling.
const bodyParser = require("body-parser");
const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const opentelemetry = require("@opentelemetry/api");

//For next time (11/21)
//Ensure all spans log their response.
//Do span statistics for Span Records (you can shut down Zipkin at this point)
//Do span TOPSIS .
//Do request path risk summary; sum of topsis scores of all spans involved in path.

//---Configuration; port, where relevant...---//
const config = require('config');
const HOST = config.get('host');
const PORT = config.get('ports.frontend');
const PATH_NAME_FLAG = config.get('pathNameFlag');

const tracer = require('./instrumentation')(MY_NAME_IS);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())

//These are all one-offs and only are used at the very end of a request.
const URLForAdd = 'http://' + HOST + ':' + config.get('ports.micros.services.addPatient')

//All of these need to be checked to ensure valitidy so just iterate through the list.
const URLsForAddCheck = {
  fname   : 'http://' + HOST + ':' + config.get('ports.micros.filters.name'),
  sname   : 'http://' + HOST + ':' + config.get('ports.micros.filters.name'),
  ssn    : 'http://' + HOST + ':' + config.get('ports.micros.filters.ssn'),
  pNum   : 'http://' + HOST + ':' + config.get('ports.micros.filters.pNum'),
  sex    : 'http://' + HOST + ':' + config.get('ports.micros.filters.sex'),
  diag   : 'http://' + HOST + ':' + config.get('ports.micros.filters.diag'),
  stCod  : 'http://' + HOST + ':' + config.get('ports.micros.filters.stCod')
}
//Pick and choose which URL you need.
const URLsForGetCheck = {
  name : 'http://' + HOST + ':' + config.get('ports.micros.filters.name'),
  ssn  : 'http://' + HOST + ':' + config.get('ports.micros.filters.ssn')
}
const URLForGet = {
  name : 'http://' + HOST + ':' + config.get('ports.micros.services.getPatientByName'),
  ssn  : 'http://' + HOST + ':' + config.get('ports.micros.services.getPatientBySSN')
}
const URLForDel =  {
  name : 'http://' + HOST + ':' + config.get('ports.micros.services.delPatientByName'),
  ssn  : 'http://' + HOST + ':' + config.get('ports.micros.services.delPatientBySSN'),
}
const URLForEdit =  {
  pNum   : 'http://' + HOST + ':' + config.get('ports.micros.updaters.updPNum'),
  sex    : 'http://' + HOST + ':' + config.get('ports.micros.updaters.updSex'),
  diag   : 'http://' + HOST + ':' + config.get('ports.micros.updaters.updDiag'),
  stCod  : 'http://' + HOST + ':' + config.get('ports.micros.updaters.updStCod')
}
const URLForEditCheck =  {
  pNum   : 'http://' + HOST + ':' + config.get('ports.micros.filters.pNum'),
  sex    : 'http://' + HOST + ':' + config.get('ports.micros.filters.sex'),
  diag   : 'http://' + HOST + ':' + config.get('ports.micros.filters.diag'),
  stCod  : 'http://' + HOST + ':' + config.get('ports.micros.filters.stCod')
}

/**
 * Get contents from the specified URL and return them.
 * args is a JSON containing any necessary arguments (headers only)
 */
const getUrlContents = (url, args) => {
  return new Promise((resolve, reject) => { 
    fetch(url, {
      method: "GET",
      headers: {
        args
      }
    }, reject)
    .then(res => res.text())
    .then(body => resolve(body))
  })
}

/**
 * For semantic reasons this particular endpoint needs to have the "name" and
 * "surname" fields spelled out for it explicitly by pulling them out of the arguments
 */
const getPatientForName = (args) => {
  return new Promise((resolve, reject) => { 
    fetch(URLForGet.name, {
      method: "GET",
      headers: {
        fname : args.fname,
        sname : args.sname
      }
    }, reject)
    .then(res => res.text())
    .then(body => resolve(body))
  })
}

/**
 * Get contents from the specified URL and return them.
 * args is a JSON containing any necessary arguments (headers only)
 */
const delUrlContents = (url, args) => {
  return new Promise((resolve, reject) => { 
    fetch(url, {
      method: "DELETE",
      headers: {
        args
      }
    }, reject)
    .then(res => res.text())
    .then(body => resolve(body))
  })
}

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

/**
 * PATCH contents from the specified URL and return them.
 * args is a JSON containing any necessary arguments (body only)
 */
const patchToURL = (url, args) => {
  return new Promise((resolve, reject) => { 
    fetch(url, {
      method: "patch",
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


//Create a new patient with all necessary fields.
app.post('/addP', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))
    span.setAttribute(PATH_NAME_FLAG, "add")
    console.log(req)

    console.log(PORT + ":Recieved POST on addP.")
    resultant = "";
    queryResult = null;

    //You can add more URLs at the top of this file; this ensures all of them are checked
    //without needing to add special cases.
    isGood = true;

    //console.log(URLsForAddCheck.fname)

    for (var thisURL in URLsForAddCheck) {
      console.log("Which are we checking?", thisURL)
      const valueToCheck = req.body[thisURL]
      console.log("What did we get?", valueToCheck)
      console.log("Where are we going?", URLsForAddCheck[thisURL])
      isGood = JSON.parse(await postToUrl(URLsForAddCheck[thisURL], {"check" : valueToCheck})).content

      //We don't need undefined propagation, thank you.
      if (isGood === undefined)
        isGood = false
      
      if(!isGood)
        break;
    }

    console.log("Goodness", req.body)

    if (isGood) {
      //TODO Check in case error is barfed where patient already exists.
      resultant = await postToUrl(URLForAdd, req.body)


    } else {
      res.statusCode = 400;
      resultant = {"error" : "bad or missing patient information provided"}
    }

    span.setAttribute('response', JSON.stringify(resultant))


    //Success determines this, else send error.
    res.type('json')
    res.send(
      resultant
    )
    span.end();
  });
})
//Retrieve a patient from the database given Name and or SSN
//Name is preferred and used first as SSN is sensitive information
app.get('/getP', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    //First check the sent information to see what's up.
    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const mySSN = req.headers.ssn;
    myPathName = "get; "

    
    console.log("Headers in Request: ", req.headers)
    console.log(myName, mySurname, mySSN)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content
    const isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, should be good")
      console.log("WEIRDNESS BEHAVIOR:",myName, mySurname, mySSN)
      myPathName = myPathName.concat("name")
      resultant = await getPatientForName({fname : myName, sname: mySurname})
    } else if (isGoodSSN) {
      console.log("bad name, checking ssn")
      myPathName = myPathName.concat("ssn")
      resultant = await getUrlContents(URLForGet.ssn, JSON.stringify({"ssn" : mySSN}))
    } else {
      res.statusCode = 400;
      resultant = {"Error" : "Input invalid; not a valid name/SSN, or none provided."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

app.get('/getPname', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    //First check the sent information to see what's up.
    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const myPathName = "get; name"

    console.log("Headers in Request: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      resultant = await getPatientForName({fname : myName, sname: mySurname})
    } else {
      res.statusCode = 400;
      resultant = {"Error" : "Input invalid; not a valid name."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

app.get('/getPssn', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    //First check the sent information to see what's up.
    const mySSN = req.headers.ssn;
    const myPathName = "get; ssn"

    
    console.log("Headers in Request: ", req.headers)
    console.log(mySSN)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSSN) {
      console.log("bad name, checking ssn")
      resultant = await getUrlContents(URLForGet.ssn, JSON.stringify({"ssn" : mySSN}))
    } else {
      res.statusCode = 400;
      resultant = {"Error" : "Input invalid; not a valid SSN."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

//Delete a patient from the database given Name and or SSN
//Name is preferred and used first as SSN is sensitive information
app.delete('/delP', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //First check the sent information to see what's up.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))
    myPathName = "delete; "


    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const mySSN = req.headers.ssn;
    console.log("Headers: ", req.headers)
    console.log(myName, mySurname, mySSN)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content
    isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    console.log("name: ", isGoodName, "last name: ", isGoodSurname, "ssn: ", isGoodSSN)

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, should be good")
      myPathName = myPathName.concat("name")
      resultant = await delUrlContents(URLForDel.name, JSON.stringify({"fname" : myName, "sname" : mySurname}))
    } else if (isGoodSSN) {
      console.log("bad name, checking ssn")
      myPathName = myPathName.concat("ssn")
      resultant = await delUrlContents(URLForDel.ssn, JSON.stringify({"ssn" : mySSN}))
    } else {
      res.statusCode = 400;
      myPathName = myPathName.concat("nothing (error)")
      resultant = {"Error" : "Input invalid; not a valid name/SSN, or none provided."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))
    
    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

app.delete('/delPname', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //First check the sent information to see what's up.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))
    const myPathName = "delete; name"


    const myName = req.headers.fname;
    const mySurname = req.headers.sname;

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content

    console.log("name: ", isGoodName, "last name: ", isGoodSurname, "ssn: ", isGoodSSN)

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      resultant = await delUrlContents(URLForDel.name, JSON.stringify({"fname" : myName, "sname" : mySurname}))
    } else if (isGoodSSN) {
      resultant = await delUrlContents(URLForDel.ssn, JSON.stringify({"ssn" : mySSN}))
    } else {
      res.statusCode = 400;
      resultant = {"Error" : "Input invalid; not a valid SSN, or none provided."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))
    
    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

app.delete('/delPssn', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //First check the sent information to see what's up.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))
    const myPathName = "delete; ssn"

    const mySSN = req.headers.ssn;

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSSN) {
      resultant = await delUrlContents(URLForDel.ssn, JSON.stringify({"ssn" : mySSN}))
    } else {
      res.statusCode = 400;
      resultant = {"Error" : "Input invalid; not a valid name/SSN, or none provided."}
    }

    span.setAttribute(PATH_NAME_FLAG, myPathName)
    span.setAttribute('response', JSON.stringify(resultant))
    
    res.type('json')
    res.send({
      resultant
    })
    span.end()
  });
})

//Update a given patient given their unique name.
//This can update any field
app.patch('/updP', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //Name is used to update the given patient; everyone has a unique name.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    myRequestName = "update; "

    console.log("Headers: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}

    console.log(
      req.headers.pnum,
      req.headers.stcod
    )
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, now checking all parameters")
      headers = req.headers;

      //Phone Number
      phoneGood = (JSON.parse(await postToUrl(URLForEditCheck.pNum,  {"check" : headers.pnum})).content)
      diagGood  = (JSON.parse(await postToUrl(URLForEditCheck.diag,  {"check" : headers.diag})).content)
      stCodGood = (JSON.parse(await postToUrl(URLForEditCheck.stCod, {"check" : headers.stcod})).content)
      sexGood   = (JSON.parse(await postToUrl(URLForEditCheck.sex,   {"check" : headers.sex})).content)

      console.log("checking all fields complete, patching...")

      if (phoneGood) {
        console.log("phone...")
        myRequestName = myRequestName.concat(" ", "pNum")
        await patchToURL(URLForEdit.pNum, {"fname" : myName, "sname" : mySurname, "pnum" : headers.pnum})
      }
      if (diagGood) {
        console.log("diagnosis...")
        myRequestName = myRequestName.concat(" ", "diag")
        await patchToURL(URLForEdit.diag, {"fname" : myName, "sname" : mySurname, "diag" : headers.diag})
      }
      if (stCodGood) {
        console.log("state code...")
        myRequestName = myRequestName.concat(" ", "stCod")
        await patchToURL(URLForEdit.stCod, {"fname" : myName, "sname" : mySurname, "stcod" : headers.stcod})
      }
      if (sexGood) {
        console.log("bio. sex...")
        myRequestName = myRequestName.concat(" ", "sex")
        await patchToURL(URLForEdit.sex, {"fname" : myName, "sname" : mySurname, "sex" : headers.sex})
      }

      resultant = JSON.parse(await getPatientForName( {fname : myName, sname : mySurname}))
    } else {
      resultant = {"Error" : "Input invalid; not a valid name, or none provided."}
    }

    //This is all the way down here to enable numerous specific test cases.
    span.setAttribute(PATH_NAME_FLAG, myRequestName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()  
  });
})

app.patch('/updPphone', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //Name is used to update the given patient; everyone has a unique name.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const myRequestName = "updateSimple_pNum"

    //const mySSN = req.headers.ssn; TODO consider ssn-based edit.
    console.log("Headers: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, now checking all parameters")
      headers = req.headers;

      //Phone Number
      phoneGood = (JSON.parse(await postToUrl(URLForEditCheck.pNum,  {"check" : headers.pnum})).content)

      console.log("checking all fields complete, patching...")

      //TODO do something with this maybe?
      if (phoneGood) {
        console.log("phone...")
        await patchToURL(URLForEdit.pNum, {"fname" : myName, "sname" : mySurname, "pnum" : headers.pnum})
      }

      resultant = JSON.parse(await getPatientForName( {fname : myName, sname : mySurname}))
    } else {
      resultant = {"Error" : "Input invalid; not a valid name, or none provided."}
    }

    //This is all the way down here to enable numerous specific test cases.
    span.setAttribute(PATH_NAME_FLAG, myRequestName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()  
  });
})

app.patch('/updPstCod', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //Name is used to update the given patient; everyone has a unique name.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const myRequestName = "updateSimple_stCod"

    //const mySSN = req.headers.ssn; TODO consider ssn-based edit.
    console.log("Headers: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content
    //isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, now checking all parameters")
      headers = req.headers;

      //Phone Number
      stCodGood = (JSON.parse(await postToUrl(URLForEditCheck.stCod, {"check" : headers.stcod})).content)

      console.log("checking all fields complete, patching...")

      //TODO do something with this maybe?
      if (stCodGood) {
        await patchToURL(URLForEdit.stCod, {"fname" : myName, "sname" : mySurname, "stcod" : headers.stcod})
      }

      resultant = JSON.parse(await getPatientForName( {fname : myName, sname : mySurname}))
    } else {
      resultant = {"Error" : "Input invalid; not a valid name, or none provided."}
    }

    //This is all the way down here to enable numerous specific test cases.
    span.setAttribute(PATH_NAME_FLAG, myRequestName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()  
  });
})

app.patch('/updPdiag', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //Name is used to update the given patient; everyone has a unique name.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const myRequestName = "updateSimple_diag"

    //const mySSN = req.headers.ssn; TODO consider ssn-based edit.
    console.log("Headers: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content
    //isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, now checking all parameters")
      headers = req.headers;

      //Phone Number
      diagGood  = (JSON.parse(await postToUrl(URLForEditCheck.diag,  {"check" : headers.diag})).content)

      console.log("checking all fields complete, patching...")

      //TODO do something with this maybe?
      if (diagGood) {
        console.log("phone...")
        await patchToURL(URLForEdit.diag, {"fname" : myName, "sname" : mySurname, "diag" : headers.diag})
      }

      resultant = JSON.parse(await getPatientForName( {fname : myName, sname : mySurname}))
    } else {
      resultant = {"Error" : "Input invalid; not a valid name, or none provided."}
    }

    //This is all the way down here to enable numerous specific test cases.
    span.setAttribute(PATH_NAME_FLAG, myRequestName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()  
  });
})

app.patch('/updPsex', async (req, res) => {
  tracer.startActiveSpan ('request', async (span) => {
    //Name is used to update the given patient; everyone has a unique name.
    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    const myName = req.headers.fname;
    const mySurname = req.headers.sname;
    const myRequestName = "updateSimple_sex"

    //const mySSN = req.headers.ssn; TODO consider ssn-based edit.
    console.log("Headers: ", req.headers)
    console.log(myName, mySurname)

    //Checker should be able to tell that a name is good/bad; we're testing them, so we don't care much.
    const isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : myName})).content
    const isGoodSurname = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : mySurname})).content
    //isGoodSSN = JSON.parse(await postToUrl(URLsForGetCheck.ssn, {"check" : mySSN})).content

    resultant = {"Error" : "No resultant returned. Did the check execute correctly?"}
    
    if (isGoodSurname && isGoodName) {
      console.log("checking name, now checking all parameters")
      headers = req.headers;

      //Phone Number
      sexGood   = (JSON.parse(await postToUrl(URLForEditCheck.sex,   {"check" : headers.sex})).content)

      console.log("checking all fields complete, patching...")

      //TODO do something with this maybe?
      if (sexGood) {
        console.log("phone...")
        await patchToURL(URLForEdit.sex, {"fname" : myName, "sname" : mySurname, "pnum" : headers.sex})
      }

      resultant = JSON.parse(await getPatientForName( {fname : myName, sname : mySurname}))
    } else {
      resultant = {"Error" : "Input invalid; not a valid name, or none provided."}
    }

    //This is all the way down here to enable numerous specific test cases.
    span.setAttribute(PATH_NAME_FLAG, myRequestName)
    span.setAttribute('response', JSON.stringify(resultant))

    res.type('json')
    res.send({
      resultant
    })
    span.end()  
  });
})

app.get('/DEBUG', async (req, res) => {
  //Do NOT change this span name until unique names for spans can be used for different services.
  tracer.startActiveSpan ('request', async (span) => {

    //ESSENTIAL FLAG! Just leave this alone!
    //span.setAttribute(REQUEST_FLAG, true)
    span.setAttribute(PATH_NAME_FLAG, 'debug' )

    span.setAttribute('headers', JSON.stringify(req.headers))
    span.setAttribute('body', JSON.stringify(req.body))

    isGoodName = JSON.parse(await postToUrl(URLsForGetCheck.name, {"check" : "Smithy Jones"})).content

    response = {
      "debug" : true,
      "content" : "This is a debug message."
    }

    span.setAttribute('response', JSON.stringify(response))

    res.type('json')
    res.send(response)
  span.end()
  });
})