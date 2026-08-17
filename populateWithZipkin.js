/**
 * ALWAYS RUN ME BEFORE YOU CLOSE ZIPKIN!
 * 
 * Zipkin DOES NOT save traces between runs, if you DO NOT run
 * this script these traces WILL BE LOST! You MUST let this script
 * finish to ensure all trace data is saved in PostgreSQL.
 */
const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('config');
const FRONTEND_PORT = config.get('ports.frontend')
const REQUEST_FLAG = config.get('requestFlag')


const prisma = new PrismaClient()

const riskScores = {
  //High risk - immediately personally identifiable or challenging to change.
  10   : ['ssn' , 'pnum'],
  //Medium risk - Sensitive and can be used to construct an identity, but not by themselves.
  5 : ['fname', 'sname', 'lname', 'diag'],
  //Low risk - Statistic, system, or highly generic information.
  1 : ['sex', 'stCod', 'patientId']


}

//Get contents from the specified URL and return them.
const getUrlContents = (url) => {
  return new Promise((resolve, reject) => { 
    fetch(url, resolve, reject)
    .then(res => res.text())
    .then(body => resolve(body))
  })
}

//Calculate the risk using the above riskScores.
//The risk is the sum of all the "hits"; this is a very simple check.
//Maybe extend with machine learning to "recognize" common issue headers?
const calculateRisk = (requestJSON) => {
  if (requestJSON === undefined) 
    return 0
  overallScore = 0
  const riskScoreKeys = Object.keys(riskScores)
  const requestJSONKeys = JSON.parse(requestJSON)
  console.log(requestJSONKeys)

  for (curRisk of riskScoreKeys) {
    flags = riskScores[curRisk]
    for (curFlag of flags) {
      console.log(requestJSON[curFlag])
      if (curFlag in requestJSONKeys) {
        console.log ("hit on ", curFlag)
        overallScore = overallScore + parseInt(curRisk);
      }
      console.log(flags)
    }
  }

  console.log("Final score:" , overallScore)
  return overallScore;
}

async function main() {
  //First assemble the list of valid ports from the config.
  const categories = Object.keys(config.ports.micros)
  const portsStartHere = config.ports.micros;
  console.log(categories, "categories")
  const portList = {}
  for (curCat of categories) {
      console.log(curCat, "curCat")
      console.log(portsStartHere[curCat])
      portsToParse = portsStartHere[curCat]
      portKeys = Object.keys(portsStartHere[curCat]);
      console.log(portKeys)

      for (curService of portKeys) {
          curPort = portsToParse[curService]

          portList[curPort] = curService
      }
  }
  console.log(portList)

  //The limit at the end can be adjusted to move more traces; 5000 is purely arbitrary.
  const response = await fetch("http://localhost:9411/api/v2/traces?serviceName=api&limit=5000");
  const jsonData = await response.json();
  console.log(response);
  console.log(jsonData)
  console.log(jsonData[0][0].traceId) //Trace 0, Tuple 0.

  for (const trace of jsonData) {
    spansIDs = []     //IDs, and only IDs, for refence.
    spansOfTrace = [] //The actual traces to be inserted later.
    requestRecords = []  //Records of requests as recorded by the frontend.
    thisTrace = trace[0].traceId
    nameOfTrace = ""; //Name given by request span's Span Name.

    //Ignore all orphaned spans to ensure everything is collected as it should be.
    if (Object.keys(trace).length > 1) {
      console.log("ACCEPTED TRACE;", thisTrace)
      for (const curSpan of trace) {
        tags = curSpan.tags
        console.log("IMPORTANT BIT:", curSpan.tags['net.peer.port'])
        console.log("CHECKING IT:", portList[curSpan.tags['net.peer.port']] )
        console.log("Has Flag?:", curSpan.tags[REQUEST_FLAG])
        console.log("Check pass?:", curSpan.tags[REQUEST_FLAG] === "true")
        console.log(curSpan)
        //Check to see if span is accepted.
        if (portList[curSpan.tags['net.peer.port']] !== undefined 
              && curSpan.tags['net.peer.port'] !== FRONTEND_PORT) {
          console.log("ACCEPTED ON PORT", curSpan.tags['net.peer.port'])

          //Start by declaring the body of the span.
          currentSpan = {
            ownerTraceID : thisTrace,
            spanID : curSpan.id,
            spanName : curSpan.name,
            serviceName : portList[tags['net.peer.port']],
            spanDuration : curSpan.duration,
            parentID : curSpan.parentId,
            methodHTTP : tags['http.method'], 
            statusHTTP : parseInt(tags['http.status_code']),
            targetHTTP : tags['http.target'],
            bodyLengthHTTP : parseInt(tags['http.response_content_length_uncompressed'])
          }

          // Debug.
          console.log(currentSpan)

          spansIDs.push(currentSpan.spanID)
          spansOfTrace.push(currentSpan)
          console.log("Pushed " + currentSpan.spanID + " to spans list." )

        //Otherwise check to see if it's a request span.
        } else if (curSpan.name === "request") {
          console.log("FOUND REQUEST SPAN NAMED: ", curSpan.name)
          console.log(curSpan.tags.headers)

          riskCalc = calculateRisk(curSpan.tags.headers) + calculateRisk(curSpan.tags.body)
          console.log("risk calculated is ", riskCalc)

          currentSpan = {
            ownerTraceID : thisTrace,
            spanID : curSpan.id,
            headers: curSpan.tags.headers,
            body: curSpan.tags.body,
            risk : riskCalc
          }

          nameOfTrace = curSpan.tags.pathName
          console.log(currentSpan)

          spansIDs.push(currentSpan.spanID)
          requestRecords.push(currentSpan)
          console.log("Pushed " + currentSpan.spanID + " to spans list." )
        }
      }
    } else {
      console.log("DENIED TRACE FOR SINGLETON SPAN; ", thisTrace)
    }

    
    //All done with spans, start logging the trace itself.
    traceBody = {
      traceID : thisTrace,
      pathName : nameOfTrace
    }
    await prisma.TraceRecord.upsert({
      where: { traceID: thisTrace },
      update:  traceBody,
      create:  traceBody
    })

    //Now create all the spans.
    for (const curSpan of spansOfTrace) {
      console.log(curSpan)
      await prisma.SpanRecord.upsert({
        //Update existing traces that have the current span ID.
        where: { spanID: curSpan.spanID },
        update: curSpan,
        create: curSpan
      })
    }

    
    //And finish with all the request records.
    for (const curRecord of requestRecords) {
      await prisma.RequestRecord.upsert({
        //Update existing traces that have the current span ID.
        where: { spanID: curRecord.spanID },
        update: curRecord,
        create: curRecord
      })
    }
    
  }
}




main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
