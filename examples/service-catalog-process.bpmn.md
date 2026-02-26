process: order-data
  name: "Order Data Products"

  start: start
    name: "Customer Request"
    -> browse

  task: browse
    name: "Browse Products"
    type: user
    service: catalog-ui
    doc: browsing
    -> validate-order

  task: validate-order
    name: "Validate Order"
    type: service
    service: catalog-order-service
    doc: order-validation
    -> check-inventory

  gateway: check-inventory
    name: "Inventory Available?"
    type: exclusive
    doc: inventory-check
    -> process-payment {condition: "available"}
    -> notify-unavailable {condition: "unavailable"}

  task: process-payment
    name: "Process Payment"
    type: service
    service: billing-service
    doc: payment-processing
    -> end-success

  task: notify-unavailable
    name: "Notify Unavailable"
    type: send
    service: notification-service
    -> end-unavailable

  end: end-success
    name: "Order Complete"

  end: end-unavailable
    name: "Order Cancelled"
