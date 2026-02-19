# Error Handling Example
# Demonstrates: subprocess, boundary events, error events, compensation

process: payment-process
  name: "Payment Processing"

  start: start
    name: "Start"

  subprocess: payment-subprocess
    name: "Process Payment"

    start: sub-start
      name: "Begin Payment"

    task: charge-card
      name: "Charge Credit Card"
      type: service
      class: com.example.PaymentService

    task: update-inventory
      name: "Update Inventory"
      type: service

    end: sub-end
      name: "Payment Complete"

    flow: sf1
      from: sub-start
      to: charge-card
    flow: sf2
      from: charge-card
      to: update-inventory
    flow: sf3
      from: update-inventory
      to: sub-end

  task: send-confirmation
    name: "Send Confirmation Email"
    type: service
    boundary: timeout
      type: timer
      duration: PT30S
      interrupting: false

  task: handle-error
    name: "Handle Payment Error"
    type: user

  task: retry-notification
    name: "Retry Notification"
    type: service

  end: success
    name: "Success"

  end: failed
    name: "Payment Failed"
    trigger: error
    error: PaymentError

  # Main flow
  flow: f1
    from: start
    to: payment-subprocess
  flow: f2
    from: payment-subprocess
    to: send-confirmation
  flow: f3
    from: send-confirmation
    to: success

  # Error handling
  flow: error-flow
    from: payment-subprocess
    to: handle-error
  flow: f5
    from: handle-error
    to: failed

  # Timeout handling
  flow: timeout-flow
    from: timeout
    to: retry-notification
  flow: f7
    from: retry-notification
    to: send-confirmation
