const { response } = require("express");
const express = require("express");
const res = require("express/lib/response");
const { v4: uuidV4 } = require("uuid");
const port = 4433;

const app = express();
app.use(express.json());

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - [])
 */

const customers = [];

/** Middleware */
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

/** Create account */
app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" });
  }

  customers.push({
    cpf,
    name,
    id: uuidV4(),
    statement: [],
  });

  return response.status(201).send();
});

// app.use(verifyIfExistAccountCPF);

/** Listing bank statement  */
app.get("/statement/", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

/** Deposit route */
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

/** Withdraw route (Saque bancário) */
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;

  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

/** list bank statement by date */
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

/**update account */
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

/**get customer account data */
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

/**remove account */
app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  //splice
  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

/**Get Balance */
app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.status(200).json(balance);
});

/**conect to server */
app.listen(`${port}`, () => {
  console.log(`✔ Started on port ${port}`);
});
