import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, ArrowLeft, CalendarDays, Tag } from 'lucide-react';

interface AssetDetail {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_value: number;
  location: string;
  condition: string;
  notes: string;
  image_url: string;
  updated_at: string;
}

interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const AssetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [category, setCategory] = useState<AssetCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    const fetchAsset = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setAsset(data as AssetDetail);

      if (data.category_id) {
        const { data: catData } = await supabase
          .from('asset_categories')
          .select('*')
          .eq('id', data.category_id)
          .single();
        if (catData) setCategory(catData as AssetCategory);
      }

      setLoading(false);
    };

    fetchAsset();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center space-y-4 max-w-sm w-full">
          <Package className="w-16 h-16 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-xl font-bold text-foreground">ไม่พบทรัพย์สิน</h2>
          <p className="text-muted-foreground text-sm">รายการนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5" />
            <span className="text-sm font-medium opacity-80">ข้อมูลทรัพย์สิน</span>
          </div>
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          {asset.code && (
            <p className="text-sm opacity-70 mt-1">รหัส: {asset.code}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Image */}
        {asset.image_url && (
          <Card className="overflow-hidden mb-4">
            <img
              src={asset.image_url}
              alt={asset.name}
              className="w-full h-56 object-cover"
            />
          </Card>
        )}

        {/* Info */}
        <Card className="p-4 space-y-4 mb-4">
          {/* Category */}
          {category && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: category.color + '20' }}
              >
                {category.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">หมวดหมู่</p>
                <p className="font-semibold text-sm">{category.name}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="w-3 h-3" /> จำนวนคงเหลือ
              </p>
              <p className="text-2xl font-bold text-foreground">
                {asset.quantity} <span className="text-sm font-normal text-muted-foreground">{asset.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">สภาพ</p>
              <Badge
                variant={asset.condition === 'ดี' ? 'default' : asset.condition === 'ชำรุด' ? 'destructive' : 'secondary'}
                className="mt-1"
              >
                {asset.condition}
              </Badge>
            </div>
          </div>

          {asset.location && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> สถานที่เก็บ
              </p>
              <p className="font-medium text-sm">{asset.location}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" /> ราคา/หน่วย
              </p>
              <p className="font-semibold">฿{asset.cost_per_unit.toLocaleString('th-TH')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">มูลค่ารวม</p>
              <p className="font-semibold text-accent">฿{asset.total_value.toLocaleString('th-TH')}</p>
            </div>
          </div>

          {asset.notes && (
            <div>
              <p className="text-xs text-muted-foreground">หมายเหตุ</p>
              <p className="text-sm">{asset.notes}</p>
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> อัปเดตล่าสุด: {new Date(asset.updated_at).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Pro Recipe Costing — ระบบจัดการทรัพย์สิน
        </p>
      </div>
    </div>
  );
};

export default AssetDetail;
