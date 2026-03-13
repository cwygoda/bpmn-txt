# Simple Flow

```bpmn
process: invoice
  pool: create-invoice
    name: "Create Invoice"

    start: start
      name: "Invoice requested"
      -> compute-discount

    task: compute-discount
      name: "Compute discount"
      -> create-invoice

    task: create-invoice
      name: "Create invoice"
      -> end

    end: end
      name: End

  pool: discount-rules
    name: "Rule engine"

    start: start-discount
      -> end-discount

    end: end-discount

  message-flow: to-discount-rule-engine
    from: compute-discount
    to: start-discount

  message-flow: from-discount-rule-engine
    from: end-discount
    to: compute-discount
```
