'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@workspace/ui/components/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Filter, Search, ArrowLeft, Tag, Users, DollarSign } from 'lucide-react';
import { fmtIDR, parseIDR, PROJECT_TYPES } from '@/lib/commercial-data';
import Link from 'next/link';

interface RateCard {
  id: string;
  type: string;
  group: string;
  role: string;
  hpp: number;
  specialRate: number;
  publishRate: number;
}

const TYPE_COLORS: Record<string, string> = {
  Consultant: 'bg-blue-100 text-blue-800 border-blue-300',
  Networking: 'bg-green-100 text-green-800 border-green-300',
  Project: 'bg-purple-100 text-purple-800 border-purple-300',
  Web: 'bg-orange-100 text-orange-800 border-orange-300',
  WMS: 'bg-pink-100 text-pink-800 border-pink-300',
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

export default function RateCardsMasterPage() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  
  // Form states
  const [formType, setFormType] = useState('Consultant');
  const [formGroup, setFormGroup] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formHPP, setFormHPP] = useState('');
  const [formSpecial, setFormSpecial] = useState('');
  const [formPublish, setFormPublish] = useState('');

  // Fetch rate cards
  const fetchRateCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/commercial-rate-cards');
      const data = await res.json();
      if (data.success) {
        setRateCards(data.data);
      } else {
        toast.error(data.message || 'Failed to load rate cards');
      }
    } catch (err) {
      toast.error('Network error: ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRateCards();
  }, [fetchRateCards]);

  // Filtered rate cards
  const filtered = useMemo(() => {
    let result = rateCards;
    if (filterType !== 'All') {
      result = result.filter((r) => r.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.role.toLowerCase().includes(q) ||
          r.group.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rateCards, filterType, searchQuery]);

  // Group by type for display
  const grouped = useMemo(() => {
    const map = new Map<string, RateCard[]>();
    filtered.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return map;
  }, [filtered]);

  // Unique groups per type
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    rateCards.filter((r) => r.type === formType).forEach((r) => groups.add(r.group));
    return Array.from(groups).sort();
  }, [rateCards, formType]);

  // Reset form
  const resetForm = () => {
    setFormType('Consultant');
    setFormGroup('');
    setFormRole('');
    setFormHPP('');
    setFormSpecial('');
    setFormPublish('');
  };

  // Open edit dialog
  const openEdit = (card: RateCard) => {
    setEditingCard(card);
    setFormType(card.type);
    setFormGroup(card.group);
    setFormRole(card.role);
    setFormHPP(formatNumber(card.hpp));
    setFormSpecial(formatNumber(card.specialRate));
    setFormPublish(formatNumber(card.publishRate));
    setIsEditOpen(true);
  };

  // Add new rate card
  const handleAdd = async () => {
    if (!formGroup.trim() || !formRole.trim() || !formHPP || !formSpecial || !formPublish) {
      toast.error('Semua field wajib diisi!');
      return;
    }
    try {
      const res = await fetch('/api/commercial-rate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          group: formGroup.trim(),
          role: formRole.trim(),
          hpp: parseIDR(formHPP),
          specialRate: parseIDR(formSpecial),
          publishRate: parseIDR(formPublish),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Rate card berhasil ditambahkan!');
        setIsAddOpen(false);
        resetForm();
        fetchRateCards();
      } else {
        toast.error(data.message || 'Gagal menambahkan');
      }
    } catch (err) {
      toast.error('Error: ' + String(err));
    }
  };

  // Update rate card
  const handleUpdate = async () => {
    if (!editingCard) return;
    if (!formGroup.trim() || !formRole.trim() || !formHPP || !formSpecial || !formPublish) {
      toast.error('Semua field wajib diisi!');
      return;
    }
    try {
      const res = await fetch('/api/commercial-rate-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCard.id,
          type: formType,
          group: formGroup.trim(),
          role: formRole.trim(),
          hpp: parseIDR(formHPP),
          specialRate: parseIDR(formSpecial),
          publishRate: parseIDR(formPublish),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Rate card berhasil diupdate!');
        setIsEditOpen(false);
        setEditingCard(null);
        resetForm();
        fetchRateCards();
      } else {
        toast.error(data.message || 'Gagal mengupdate');
      }
    } catch (err) {
      toast.error('Error: ' + String(err));
    }
  };

  // Delete rate card
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin mau hapus rate card ini?')) return;
    try {
      const res = await fetch(`/api/commercial-rate-cards?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Rate card dihapus');
        fetchRateCards();
      } else {
        toast.error(data.message || 'Gagal menghapus');
      }
    } catch (err) {
      toast.error('Error: ' + String(err));
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = rateCards.length;
    const byType = new Map<string, number>();
    rateCards.forEach((r) => {
      byType.set(r.type, (byType.get(r.type) || 0) + 1);
    });
    return { total, byType };
  }, [rateCards]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/commercial">
              <Button variant="outline" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Master Data Rate Card</h1>
              <p className="text-sm text-gray-500">Kelola HPP, Publish Rate, dan Special Rate untuk setiap role</p>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Tambah Person
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Rate Card Baru</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Group</label>
                  <Input
                    className="mt-1"
                    placeholder="Contoh: SENIOR-PROJ, MED-WEB"
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    list="group-suggestions"
                  />
                  <datalist id="group-suggestions">
                    {uniqueGroups.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role / Nama</label>
                  <Input
                    className="mt-1"
                    placeholder="Contoh: Backend, Frontend, Randy"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">HPP</label>
                    <Input
                      className="mt-1"
                      placeholder="IDR"
                      value={formHPP}
                      onChange={(e) => setFormHPP(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Special</label>
                    <Input
                      className="mt-1"
                      placeholder="IDR"
                      value={formSpecial}
                      onChange={(e) => setFormSpecial(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Publish</label>
                    <Input
                      className="mt-1"
                      placeholder="IDR"
                      value={formPublish}
                      onChange={(e) => setFormPublish(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                  Batal
                </Button>
                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PROJECT_TYPES.map((type) => (
            <Card key={type} className="border-l-4" style={{ borderLeftColor: TYPE_COLORS[type]?.split(' ')[0]?.replace('bg-', '#') || '#ccc' }}>
              <CardContent className="p-3">
                <div className="text-xs text-gray-500">{type}</div>
                <div className="text-xl font-bold text-gray-900">
                  {stats.byType.get(type) || 0}
                </div>
                <div className="text-xs text-gray-400">person</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari role, group, atau type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Semua Type</SelectItem>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Cards Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Tidak ada rate card ditemukan</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Klik "Tambah Person" untuk menambahkan'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([type, cards]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={TYPE_COLORS[type] || 'bg-gray-100'}>
                    {type}
                  </Badge>
                  <span className="text-sm text-gray-500">({cards.length} person)</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[60px]">No</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Role / Nama</TableHead>
                      <TableHead className="text-right">HPP</TableHead>
                      <TableHead className="text-right">Publish Rate</TableHead>
                      <TableHead className="text-right">Special Rate</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="w-[120px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card, idx) => {
                      const margin = card.publishRate > 0 
                        ? ((card.publishRate - card.hpp) / card.publishRate * 100).toFixed(1) 
                        : '0.0';
                      return (
                        <TableRow key={card.id} className="hover:bg-gray-50">
                          <TableCell className="text-gray-500">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-gray-700">{card.group}</TableCell>
                          <TableCell className="text-gray-900">{card.role}</TableCell>
                          <TableCell className="text-right font-mono text-gray-700">
                            {fmtIDR(card.hpp)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-700 font-medium">
                            {fmtIDR(card.publishRate)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            {fmtIDR(card.specialRate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant="outline" 
                              className={Number(margin) >= 40 ? 'bg-green-50 text-green-700 border-green-200' : Number(margin) >= 25 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}
                            >
                              {margin}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(card)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(card.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Total Summary */}
      {!loading && filtered.length > 0 && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total Rate Cards: <strong className="text-gray-900">{filtered.length}</strong> person</span>
              <span>
                Total HPP: <strong className="text-gray-900">{fmtIDR(filtered.reduce((sum, r) => sum + r.hpp, 0))}</strong>
                {'  ·  '}
                Total Publish: <strong className="text-blue-700">{fmtIDR(filtered.reduce((sum, r) => sum + r.publishRate, 0))}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rate Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Group</label>
              <Input
                className="mt-1"
                value={formGroup}
                onChange={(e) => setFormGroup(e.target.value)}
                list="group-suggestions-edit"
              />
              <datalist id="group-suggestions-edit">
                {uniqueGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role / Nama</label>
              <Input
                className="mt-1"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">HPP</label>
                <Input
                  className="mt-1"
                  value={formHPP}
                  onChange={(e) => setFormHPP(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Special</label>
                <Input
                  className="mt-1"
                  value={formSpecial}
                  onChange={(e) => setFormSpecial(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Publish</label>
                <Input
                  className="mt-1"
                  value={formPublish}
                  onChange={(e) => setFormPublish(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingCard(null); }}>
              Batal
            </Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
