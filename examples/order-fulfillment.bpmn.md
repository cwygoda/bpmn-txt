# Order Fulfillment Process
# Demonstrates: pools, lanes, gateways, events, conditions

process: order-fulfillment
  name: "Order Fulfillment"
  executable: true

  pool: customer
    name: "Customer"

    lane: ordering
      name: "Ordering"

      start: order-placed
        name: "Order Placed"
        trigger: message
        message: NewOrder

      task: submit-order
        name: "Submit Order"
        type: user

  pool: warehouse
    name: "Warehouse"

    lane: processing
      name: "Order Processing"

      task: validate-order
        name: "Validate Order"
        type: service
        class: com.example.OrderValidator

      gateway: stock-check
        type: exclusive
        name: "In Stock?"
        default: reorder-flow

      task: ship-order
        name: "Ship Order"
        type: manual

      task: reorder
        name: "Reorder from Supplier"
        type: service
        boundary: timer-escalate
          type: timer
          duration: P2D
          interrupting: false

      event: items-received
        type: catch
        trigger: message
        message: ItemsArrived

      end: end-success
        name: "Order Complete"

  # Sequence flows
  flow: f1
    from: order-placed
    to: submit-order
  flow: f2
    from: submit-order
    to: validate-order
  flow: f3
    from: validate-order
    to: stock-check
  flow: ship-flow
    from: stock-check
    to: ship-order
    condition: "inStock == true"
  flow: reorder-flow
    from: stock-check
    to: reorder
  flow: f6
    from: reorder
    to: items-received
  flow: f7
    from: items-received
    to: ship-order
  flow: f8
    from: ship-order
    to: end-success

  # Message flow between pools
  message-flow: msg-order
    from: submit-order
    to: validate-order
    message: OrderDetails
