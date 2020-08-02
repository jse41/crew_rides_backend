# Crew Rides Backend 
This is the backend of the web server. This runs using AWS Lambda Functions and a Dynamo DB to store persistant information. There are limitations like 3 seconds per call and other memory limations, but we are generally far under these requirements. This should be able to always be in the free tier as long as we stay under the calls per month limit which I assume we will. 

## AWS Lambda
Notice the JavaScript Files here, currently the backend is a singular lambda that listens to the post body to determine what to do, this may be broken into multiple functions. 

### Note on Development
Remember that we pay for server time, we do not pay for client time. With this in mind, try to keep development on front-end frameworks opposed to the backend when possible as then it is essentially "free" for us. 

## Dynamo DB 
This table structure is not my favorite, redundant information is stored for faster retrieval, and I'm worried about data accidentially growing. 

### Access
Stores sessions essentially. 
- Cooks: The cookie stored.
- time: The Time to Live attribute of the database, so AWS will automatically remove sessions after they expire. Session time is set by the server. 
- user: The userID associated with that cookie so we can return the personalized experience. 

### Rowers
Stores the rower specific information and preferences. Likely to change and grow during development. 
- CaseID: Unique Identifying case ID which is provided from CWRU oAuth.
- location: Where they reside. 
- name: Their name, self explanatory.
- permission: Their level of access to alter and change information (1: Root, 2: Privileged, 3: None). 
- year: Their academic year (numeric). 
- carID: The car which they belong to at the moment. 

### Cars
Stores the information about cars in the database, this is a mess. 
- carID: Uniquie identifier of the car. 
- car: Car description. 
- driver: CaseID of the driver. 
- driverName: The name of the driver (redundant info). 
- passengers: The number of passengers assigned to the car. 
- loc\[1-x\]: The location of the pickups (1-4 relate to passengers 1-4, hypotherically could be more).
- name\[1-x\]: The name of the associated passenger. 
- pass\[1-x\]: The CaseID of the associated passenger. 
- time\[1-x\]: The pickup time of the associated passenger (in standard string format). 
