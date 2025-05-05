import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getItems() {
  const res = await fetch('http://localhost:3000/api/items');
  const items = await res.json();
  return items;
}

async function getUsersAndAccounts() {
  const users = await prisma.user.findMany();
  const accounts = await prisma.account.findMany();
  return { users, accounts };
}

export default async function Home() {
  const items = await getItems();
  const { users, accounts } = await getUsersAndAccounts();

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {items.map((item: any) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>

      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Accounts</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>UserID</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>{account.id}</td>
              <td>{account.userId}</td>
              <td>{account.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
