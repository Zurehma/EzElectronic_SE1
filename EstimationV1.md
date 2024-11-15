# Project Estimation - CURRENT
Date: 29/04/2024

Version: 1


# Estimation approach
Consider the EZElectronics  project in CURRENT version (as given by the teachers), assume that you are going to develop the project INDEPENDENT of the deadlines of the course, and from scratch
# Estimate by size
### 
|             | Estimate                        |             
| ----------- | ------------------------------- |  
| NC =  Estimated number of classes to be developed   |     12                        |             
|  A = Estimated average size per class, in LOC       |   200                          | 
| S = Estimated size of project, in LOC (= NC * A) | 2400 |
| E = Estimated effort, in person hours (here use productivity 10 LOC per person hour)  |         240 ph                             |   
| C = Estimated cost, in euro (here use 1 person hour cost = 30 euro) | 7200 euros | 
| Estimated calendar time, in calendar weeks (Assume team of 4 people, 8 hours per day, 5 days per week ) |   1.5 weeks                 |               

# Estimate by product decomposition
### 
|         component name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
|requirement document    | 35 |
| GUI prototype | 5 |
|design document | 7|
|**code** <br> - _User Classes_ <br> - _Product Classes_ <br> -  _Cart Classes_  | **100** <br>  40 <br>  35 <br>  25  |
| unit tests |25|
| api tests | 15|
| management documents  | 5|



# Estimate by activity decomposition
### 
|         Activity name    | Estimated effort (person hours)   |             
| ----------- | ------------------------------- | 
|Requirements Defintion | 35 |
| GUI Design| 5 |
|Design|7|
|Implementation (Code & Testing)|140|
|Project management|5|
###

![](assets/Gantt_V1.png)

# Summary

Report here the results of the three estimation approaches. The  estimates may differ. Discuss here the possible reasons for the difference

When estimating by size, factors such as number of features and lines of code affect the estimated effort, however, it does not take into account the varying complexities of the features as some features would be easier to manage than others and would thus require less effort. When estimating by product decomposition the complexity of the different modules becomes more clear and it becomes apparent that which parts of the development will take more time and effort. With the estimation by activity, the most accurate time duration can be seen as it takes into account the sequence of events. It allows the visualization (as in the Gantt Chart above) of the activities that can be done in parallel and which activities can only be done when the previous have been completed.

|             | Estimated effort                        |   Estimated duration |          
| ----------- | ------------------------------- | ---------------|
| estimate by size |240| 7.5 days|
| estimate by product decomposition | 192 | 6 days|
| estimate by activity decomposition |192  | 9 days|




