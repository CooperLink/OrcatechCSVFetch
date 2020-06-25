const inventory = require('.')
let homeID = process.argv[2]
console.log("HomeID: " + homeID)
let subjectID = process.argv[3]
console.log("subjectID: " + subjectID)

inventory(homeID, subjectID)