import SignIn from '@/components/sign-in';
import SendSessionButton from '@/components/send-session-button'; // SendSessionButtonをインポート
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

export const runtime = 'nodejs'; // Edge RuntimeでのPrismaClientエラーを回避

export default async function Home() {
  const items = await getItems();
  const { users, accounts } = await getUsersAndAccounts();

  return (
    <div>
      <SignIn />
      <SendSessionButton /> {/* SendSessionButtonを追加 */}
      <h1>Products</h1>
      <ul>
        {items.map((item: { id: string; name: string | null; email: string | null; emailVerified: Date | null; image: string | null }) => (
          <li key={item.id}>{item.name || item.email}</li> // item.title は存在しないため、name または email を表示
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
