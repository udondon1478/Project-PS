import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getItems() {
  const res = await fetch('http://localhost:3000/api/items');
  const items = await res.json();
  return items;
}

export default async function Home() {
  const items = await getItems();

  return (
    <div>
      <h1>Items</h1>
      <ul>
        {items.map((item: any) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
