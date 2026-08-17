//Simply gets the results of TOPSIS analysis from the database and prints
//them in descending order of score/risk.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

async function main() {
    pathResults = 
        await prisma.$queryRaw`
            SELECT "name", "riskScore", "recordCount" FROM traces."PathAnalysisRecord"
            ORDER BY "riskScore" DESC 
        `;
    
    topsisResults = 
        await prisma.$queryRaw`
            SELECT traces."ServiceAnalysisRecord"."name", "score", "recordCount" FROM traces."ServiceAnalysisRecord"
            INNER JOIN traces."serviceTopsisScores" ON traces."ServiceAnalysisRecord"."name" = traces."serviceTopsisScores"."name"
            ORDER BY "score" DESC
        `;
    
    console.log("PATH SCORES (lower is better) ------")
    for (path of pathResults) {
        console.log (
            "Path: " + path.name + ", Risk Score: " + path.riskScore + ", Record Count: " + path.recordCount
        )
    }
    console.log("-------------------------------------\n")

    console.log("SERVICE SCORES (lower is better) ------")
    for (service of topsisResults) {
        console.log (
            "Service: " + service.name + ", TOPSIS Score: " + service.score + ", Record Count: " + service.recordCount
        )
    }
    console.log("-------------------------------------\n")

}

main();