# Simple Sequential Process

process: simple-process
  name: "Simple Process"

  start: start
    name: "Start"

  task: task-1
    name: "Do Something"
    type: user

  task: task-2
    name: "Do Something Else"
    type: service

  end: end
    name: "End"

  flow: f1
    from: start
    to: task-1
  flow: f2
    from: task-1
    to: task-2
  flow: f3
    from: task-2
    to: end
