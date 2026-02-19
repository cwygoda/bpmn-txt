# Approval Workflow
# Demonstrates: exclusive gateway, parallel gateway, conditions

process: approval-workflow
  name: "Document Approval"

  start: request-submitted
    name: "Request Submitted"

  task: initial-review
    name: "Initial Review"
    type: user
    assignee: reviewer

  gateway: needs-approval
    type: exclusive
    name: "Needs Manager Approval?"

  gateway: parallel-split
    type: parallel
    name: "Start Parallel Reviews"

  task: legal-review
    name: "Legal Review"
    type: user

  task: finance-review
    name: "Finance Review"
    type: user

  gateway: parallel-join
    type: parallel
    name: "All Reviews Complete"

  task: manager-approval
    name: "Manager Approval"
    type: user
    assignee: manager

  gateway: approved
    type: exclusive
    name: "Approved?"

  task: notify-requester
    name: "Notify Requester"
    type: service

  end: completed
    name: "Process Complete"

  end: rejected
    name: "Request Rejected"
    trigger: error

  # Main flow
  flow: f1
    from: request-submitted
    to: initial-review
  flow: f2
    from: initial-review
    to: needs-approval

  # Simple approval path
  flow: simple-path
    from: needs-approval
    to: notify-requester
    condition: "amount < 1000"

  # Complex approval path
  flow: complex-path
    from: needs-approval
    to: parallel-split
    condition: "amount >= 1000"
  flow: f4
    from: parallel-split
    to: legal-review
  flow: f5
    from: parallel-split
    to: finance-review
  flow: f6
    from: legal-review
    to: parallel-join
  flow: f7
    from: finance-review
    to: parallel-join
  flow: f8
    from: parallel-join
    to: manager-approval
  flow: f9
    from: manager-approval
    to: approved

  # Final decision
  flow: approve-flow
    from: approved
    to: notify-requester
    condition: "decision == 'approved'"
  flow: reject-flow
    from: approved
    to: rejected
    condition: "decision == 'rejected'"
  flow: f12
    from: notify-requester
    to: completed
