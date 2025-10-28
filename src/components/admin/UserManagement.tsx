"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Role, UserStatus } from '@prisma/client';
import { toast } from 'sonner';

type UserWithLastLogin = User & {
  sessions: { createdAt: Date }[];
};

export default function UserManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserWithLastLogin[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
    isSuspicious: '',
  });
  const [isDetecting, setIsDetecting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    if (filters.name) params.set('name', filters.name);
    if (filters.email) params.set('email', filters.email);
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    if (filters.isSuspicious) params.set('isSuspicious', filters.isSuspicious);

    try {
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      } else {
        const error = await res.text();
        toast.error('Failed to fetch users', {
          description: error,
        });
    }
    } catch (error) {
    console.error('Error fetching users:', error);
    toast.error('Network error while fetching users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleUpdateUser = async (userId: string, data: { role?: Role; status?: UserStatus }) => {
    try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
      toast.success('User updated successfully.');
    } else {
      const error = await res.text();
      toast.error('Failed to update user', {
        description: error,
      });
    }
  } catch (error) {
    console.error('Network error updating user:', error);
    toast.error('Network error', {
      description: 'Failed to update user due to network error.',
    });
  }
  };

  const handleDetectSuspiciousUsers = async () => {
    setIsDetecting(true);
    try {
    const res = await fetch('/api/admin/users/detect-suspicious', { method: 'POST' });

    if (res.ok) {
      const data = await res.json();
      toast.success(data.message);
      fetchUsers(); // Refresh the user list
    } else {
      const error = await res.text();
      toast.error('Failed to run detection', {
        description: error,
      });
    }
  } catch (error) {
    console.error('Network error during detection:', error);
    toast.error('Network error', {
      description: 'Failed to connect to the server.',
    });
  } finally {
    setIsDetecting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={handleDetectSuspiciousUsers} disabled={isDetecting}>
          {isDetecting ? 'Detecting...' : 'Detect Suspicious Users'}
        </Button>
      </div>
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Filter by name..."
          value={filters.name}
          onChange={(e) => handleFilterChange('name', e.target.value)}
        />
        <Input
          placeholder="Filter by email..."
          value={filters.email}
          onChange={(e) => handleFilterChange('email', e.target.value)}
        />
        <Select onValueChange={(value) => handleFilterChange('role', value)} defaultValue="">
          <SelectTrigger><SelectValue placeholder="Filter by role..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            <SelectItem value={Role.ADMIN}>Admin</SelectItem>
            <SelectItem value={Role.USER}>User</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => handleFilterChange('status', value)} defaultValue="">
          <SelectTrigger><SelectValue placeholder="Filter by status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value={UserStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={UserStatus.SUSPENDED}>Suspended</SelectItem>
            <SelectItem value={UserStatus.DELETED}>Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => handleFilterChange('isSuspicious', value)} defaultValue="">
          <SelectTrigger><SelectValue placeholder="Filter by suspicion..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Users</SelectItem>
            <SelectItem value="true">Suspicious</SelectItem>
            <SelectItem value="false">Not Suspicious</SelectItem>
          </SelectContent>
        </Select>
      </div>
      { isLoading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className={user.isSuspicious ? 'bg-red-100' : ''}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.status}</TableCell>
              <TableCell>
                {user.sessions?.[0] ? new Date(user.sessions[0].createdAt).toLocaleString() : 'Never'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {/* Role Change */}
                    {user.role === Role.USER && <DropdownMenuItem onClick={() => handleUpdateUser(user.id, { role: Role.ADMIN })}>Make Admin</DropdownMenuItem>}
                    {user.role === Role.ADMIN && <DropdownMenuItem onClick={() => handleUpdateUser(user.id, { role: Role.USER })}>Make User</DropdownMenuItem>}
                    {/* Status Change */}
                    {user.status === UserStatus.ACTIVE && <DropdownMenuItem onClick={() => handleUpdateUser(user.id, { status: UserStatus.SUSPENDED })}>Suspend</DropdownMenuItem>}
                    {user.status === UserStatus.SUSPENDED && <DropdownMenuItem onClick={() => handleUpdateUser(user.id, { status: UserStatus.ACTIVE })}>Unsuspend</DropdownMenuItem>}
                    <DropdownMenuItem className="text-red-600" onClick={() => handleUpdateUser(user.id, { status: UserStatus.DELETED })}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      ) }
       {/* Pagination Controls */}
       <div className="flex justify-between mt-4">
         <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
         <span>Page {currentPage} of {totalPages}</span>
         <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
       </div>
    </div>
  );
}
