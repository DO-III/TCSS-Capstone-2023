//Analyze all the traces and spans collected
//to assign risk scores for services and paths.

//this is a three step process.
//1. analye all the services in the SpanRecords table and send that to ServiceAnalysisRecords
//2. perform TOPSIS on the records and log the scores.
//3. take the sum of the scores and add the Risk parameter. That creates the last thing.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient()

//Change this to determine good/bad TOPSIS values.
const GOODNESSES = [true, true, true, true, true]


async function main() {
    analyzedServices = [];
    //Step 1. Get all the services together and derive some statistics.
    servicesToAnalyze = await prisma.$queryRaw`
    SELECT traces."SpanRecord"."serviceName" as nameofservice,
        count(traces."SpanRecord"."serviceName") as serviceruncount,
        avg(traces."SpanRecord"."spanDuration") as duration_avg,
        stddev_pop(traces."SpanRecord"."spanDuration") as duration_stdev,
        avg(traces."SpanRecord"."bodyLengthHTTP") as body_avg,
        stddev_pop(traces."SpanRecord"."bodyLengthHTTP") as body_stdev,

        COUNT (CASE WHEN traces."SpanRecord"."statusHTTP" >= 500 THEN 1 END) 
            / count(traces."SpanRecord"."serviceName")::float as failPercent
        FROM traces."SpanRecord"
        GROUP BY traces."SpanRecord"."serviceName"
    `;
    //console.log(servicesToAnalyze)

    //Step 2. Prepare each service to be sent to the Service Span Record table.
    for (service of servicesToAnalyze) {
        sendMe = {
            name : service.nameofservice,
            recordCount : parseInt(service.serviceruncount),
            time_avg : service.duration_avg,
            time_StDev : service.duration_stdev,
            body_avg : service.body_avg,
            body_StDev  : service.body_stdev,
            fail_ratio : service.failpercent
        }
        //console.log(sendMe)

        await prisma.serviceAnalysisRecord.upsert({
            //Update existing traces that have the current span ID.
            where: { name : sendMe.name },
            update: sendMe,
            create: sendMe
        })
    }

    //Step 3 - We perform TOPSIS on all the ServieAnalysisRecords.
    //TODO different TOPSIS options?

    //Start by organizing everything into a 2D array.
    //We begin by getting every serviceRecord.
    serviceRecords = await prisma.serviceAnalysisRecord.findMany()
    //Then we load them into an array like so.
    toTopsis = []
    for (record of serviceRecords) {
        toPush = [
            record.name,
            parseFloat(record.time_avg),
            parseFloat(record.time_StDev + 1), 
            parseFloat(record.body_avg),
            parseFloat(record.body_StDev + 1),
            parseInt(record.fail_ratio + 1) //This in particular as these can be all 0.
        ]
        toTopsis.push(toPush)
    }
    console.log(toTopsis)

    //We "topsis" this array with the following method.
    performanceRatings = topsisEntropy(toTopsis, GOODNESSES)
    //Which gives us the performance ratings. We'll quickly load up the DB with them
    //just to make sure they aren't lost.
    serviceNames = Object.keys(performanceRatings)
    for (service of serviceNames) {
        temp = {
            name : service,
            score : performanceRatings[service]
        }
        
        await prisma.serviceTopsisScores.upsert({
            //Update existing traces that have the current span ID.
            where: { name : service},
            update: temp,
            create: temp
        })
    }

    //Now for the big one.
    //Get all the trace paths first.
    traceParents = await prisma.traceRecord.findMany()
    //And the first ugly SQL to store the service runs.
    //Be sure to get the number of instances of a path by name.
    pathCount = await prisma.$queryRaw`
        SELECT traces."TraceRecord"."pathName" as nameofpath,
        count(traces."TraceRecord"."pathName") as runcount
        FROM traces."TraceRecord"
        GROUP BY traces."TraceRecord"."pathName"
        `;
    pathJSON = {}
    for (path of pathCount) {
        pathJSON[path.nameofpath] = parseInt(path.runcount)
    }
    console.log(pathJSON)


    pathLogList = [];
    console.log(traceParents)
    for (trace of traceParents) {
        //Get the list of services from the DB for each trace.
        services = []
        dbServices = await prisma.$queryRaw`
            SELECT traces."SpanRecord"."serviceName" 
            FROM traces."SpanRecord" 
            INNER JOIN traces."serviceTopsisScores"  ON traces."SpanRecord"."serviceName" = traces."serviceTopsisScores"."name"
            WHERE traces."SpanRecord"."ownerTraceID" = ${trace.traceID}
            `;
        //Now we add these to a running list...
        for (service of dbServices) {
            services.push(service.serviceName)
        }
        //Quickly grab the sum of all the TOPSIS scores of this service.
        sumOfServices = await prisma.$queryRaw`
        SELECT SUM(traces."serviceTopsisScores"."score")
            FROM traces."SpanRecord" 
            INNER JOIN traces."serviceTopsisScores"  ON traces."SpanRecord"."serviceName" = traces."serviceTopsisScores"."name"
            WHERE traces."SpanRecord"."ownerTraceID" = ${trace.traceID}
            `;
        sumOfServices[0].traceID = trace.traceID
        console.log("SUM", sumOfServices)

        //And calculate the final risk score.
        //...by grabbing the risk score from the request.
        riskBase = await prisma.$queryRaw`
        SELECT risk FROM traces."RequestRecord"
            WHERE "ownerTraceID" = ${trace.traceID}
        `
        console.log(riskBase)
        realRisk = sumOfServices[0].sum * riskBase[0].risk;

        runCount = pathJSON[trace.pathName]

        //And log the trace information in the database. 
        toLog = {
            name : trace.pathName,
            recordCount : runCount,
            servicesUsed : services,
            servicesCount : services.length,
            riskScore : parseFloat(realRisk)

        }
        console.log(toLog)
        pathLogList.push(toLog)
    }

    for (loggingThis of pathLogList) {
        await prisma.pathAnalysisRecord.upsert({
            //Update existing traces that have the current span ID.
            where: { name : loggingThis.name},
            update: loggingThis,
            create: loggingThis
        })
    }
}

const topsisEntropy = (baseArray, goodnesses) => {
    console.log("BASEARRAYIS", JSON.stringify(baseArray))
    console.log()

    console.log("Performing ENTROPY-TOPSIS with the given array.")
    weights = entropyWeights(baseArray, goodnesses)
    return(topsis(baseArray, weights, goodnesses))
}

/**
 * Perform TOPSIS on the given array with the given weights.
 */
const topsis = (baseArray, weightsArray, goodnesses) => {
    normalized = topsisNormalizeAndWeight(baseArray, weightsArray);
    console.log("NORMALIZED IN TOPSIS:", JSON.stringify(normalized))
    results = topsisEuclideanValues(normalized, goodnesses)
    return(results)
    //Repeat for all columns.
}

const topsisNormalizeAndWeight = (baseArray, weightsArray) => {
    toNormalize = JSON.parse(JSON.stringify(baseArray))
    //Start by taking the squared sum of every column,
    //then dividing every value in the column by it.
    //We then incorporate the weight by multiplying the weight by the new value.
    //We unfortunately must do this in two steps.
    for (col = 1; col < toNormalize[0].length; col += 1) {
        denom = 0.0
        for (row = 0; row < toNormalize.length; row += 1) {
            denom += Math.pow(toNormalize[row][col], 2);
        }
        denom = Math.sqrt(denom)
        for (row = 0; row < toNormalize.length; row += 1) {
            toNormalize[row][col] /= denom;
            toNormalize[row][col] *= weightsArray[col - 1] //Offset for name column.
        }
    }
    console.log(toNormalize)
    return(toNormalize)
}

const topsisEuclideanValues = (baseArray, goodnesses) => {
    //Start by taking the best/worst values according to goodness.
    values = []
    console.log("BASE EUCLID", JSON.stringify(baseArray))

    //Get the "best" value in every column with respect to
    //whether we minimize ("bad") or maximize ("good")
    console.log(baseArray[0].length)
    for (col = 1; col < baseArray[0].length; col += 1) {
        biggest = baseArray[0][col];
        smallest = baseArray[0][col];
        for (row = 0; row < baseArray.length; row += 1) {
            current = baseArray[row][col];
            if (current > biggest)
                biggest = current
            if (current < smallest)
                smallest = current
        }

        toPush = null
        //console.log(goodnesses[col-1])
        if (goodnesses[col - 1] === true) { //offset for names
            toPush = {
                best : biggest,
                worst : smallest
            }
        } else {
            toPush = {
                best : smallest,
                worst : biggest
            }
        }
        console.log("Push", toPush)
        values.push(toPush)
    }
    console.log("VALUES FOUND?:", values)

    //Now we find the Euclidean values of the alternatives by checking
    //the distance of each alternative from the best and worst alternatives.
    //For "best" values we subtract the best value from the normalized value and square it,
    //adding those together as we go. When we're finished with the adding,
    //we take the square root of the whole sum. We repeat the process for the "worst" values.
    euclidValues = [];
    for (row = 0 ; row < baseArray.length; row += 1) {
        myName = baseArray[row][0]; //Alternative's name.
        curEucs = {};
        distBest = 0.0;
        distWorst = 0.0;
        
        for (col = 1; col < baseArray[0].length; col += 1) {
            distBest += Math.pow(
                baseArray[row][col] - values[col - 1].best , 2
            )
            distWorst += Math.pow(
                baseArray[row][col] - values[col - 1].worst , 2
            )
        }

        distBest = Math.sqrt(distBest)
        distWorst = Math.sqrt(distWorst)
        
        euclidValues.push({
            "name" : myName,
            best : distBest,
            worst : distWorst
        })
    }
    console.log(euclidValues)

    performance = {};
       for (current of euclidValues) {
        curPerfValue = current.worst / (current.best + current.worst)
        performance[current.name] = curPerfValue;
    }
    console.log(performance)

    return(performance)
}

const entropyWeights = (baseArray) => {
    normalized = entropyNormalize(baseArray)
    entropyValues = []
    degrees = []
    degreeSum = 0.0
    
    //Start by calculating h; it's -(1/ln(n)), where "n" is the number of alternatives.
    hValue = (1.0 / Math.log(normalized.length)) * -1
    console.log(hValue)

    //Calculate entropy by first multiplying each value by its natural log
    //Then adding that to the running sum.
    //The entropy is that value * hVal.
    //And the degree is 1 - entropy in that column.
    //Finally we add that degree to the sum of degrees, which we will use for the weights.
    for (col = 1; col < normalized[0].length; col += 1) {
        runSum = 0.0
        for (row = 0; row < normalized.length; row += 1) {
            normalized[row][col] *= Math.log(normalized[row][col])

            runSum += normalized[row][col]
        }
        //console.log(runSum)
        entropyValues.push(runSum * hValue)
        degrees.push(1 - runSum * hValue)
        degreeSum += (1 - runSum * hValue)
    }
    console.log("NORMALIZED IN ENTROPYNORM:", normalized)
    //console.log(entropyValues)
    
    //Now we find weight vectors using the degrees and the sum.
    //These are trivial to find.
    weights = []
    weightSum = 0.0
    for (thisDegree of degrees) {
        weights.push(thisDegree / degreeSum)
        weightSum += (thisDegree / degreeSum)
    }
    return(weights)
}

const entropyNormalize = (baseArray) => {
    console.log("IN NORMALIZE", JSON.stringify(baseArray))
    toNormalize = JSON.parse(JSON.stringify(baseArray))
    for (col = 1; col < toNormalize[0].length; col += 1) {
        runSum = 0.0;
        //Take the sum of all values in the column.
        for (row = 0; row < toNormalize.length; row += 1) {
            runSum += toNormalize[row][col];
        }
        //Divide all values in this column by that value.
        for (row = 0; row < toNormalize.length; row += 1) {
            toNormalize[row][col] /= runSum
        }
    }
    console.log("TONORMALIZE RESULT:", toNormalize)

    return(toNormalize)
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