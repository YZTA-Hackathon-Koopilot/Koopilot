import React, { useState, useEffect } from 'react';
import { getInventory, updateProduct, createProduct } from '../services/api';
import { Package, AlertTriangle, TrendingUp, Search, Plus, Edit2, Save, X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { uploadInventory } from '../services/api';
const InventoryPanel = ({ searchTerm }) => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: 0,
    price: 0,
    unit: 'Adet',
    description: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    item.category.toLowerCase().includes((searchTerm || '').toLowerCase())
  );
  const fetchInventory = async () => {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      console.error('Stok verisi çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchInventory();
  }, []);
  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        stock: product.stock,
        price: product.price,
        unit: product.unit,
        description: product.description || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: '',
        stock: 0,
        price: 0,
        unit: 'Adet',
        description: ''
      });
    }
    setIsModalOpen(true);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (error) {
      alert('Kaydedilirken bir hata oluştu.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadInventory(file);
      alert(`Yükleme başarılı! ${result.creations} yeni ürün eklendi, ${result.updates} ürün güncellendi.`);
      fetchInventory();
    } catch (error) {
      console.error('Yükleme hatası:', error);
      alert('Dosya yüklenirken bir hata oluştu: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,category,stock,price,unit,description\nÖrnek Ürün,Kategori,10,50.0,Adet,Ürün açıklaması";
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "koopilot_urun_sablonu.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (isLoading) return <div style={{ padding: '24px' }}>Yükleniyor...</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '20px' }}>Envanter Yönetimi</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .csv" 
            style={{ display: 'none' }} 
          />
          <button 
            onClick={downloadTemplate}
            title="Excel Şablonu İndir"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-light)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2'
            }}
          >
            <Download size={18} /> Şablon
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-dark)',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: isUploading ? 0.7 : 1
            }}
          >
            <Upload size={18} /> {isUploading ? 'Yükleniyor...' : 'Toplu Yükle'}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--primary-mid)',
              color: 'var(--on-primary)',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(45, 106, 79, 0.2)'
            }}
          >
            <Plus size={18} /> Yeni Ürün Ekle
          </button>
        </div>
      </div>
      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(45, 106, 79, 0.1)', borderRadius: '14px', color: 'var(--primary-mid)' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Toplam Ürün</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{filteredInventory.length}</div>
          </div>
        </div>
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(230, 57, 70, 0.1)', borderRadius: '14px', color: 'var(--error)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Düşük Stok Uyarıları</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{filteredInventory.filter(i => i.stock < 5).length}</div>
          </div>
        </div>
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(42, 157, 143, 0.1)', borderRadius: '14px', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Kategori Sayısı</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{[...new Set(inventory.map(i => i.category))].length}</div>
          </div>
        </div>
      </div>
      {}
      <div style={{
        backgroundColor: 'var(--white)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid var(--border-color)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--surface-soft)' }}>
               <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>Ürün Adı</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>Kategori</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>Stok</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>Birim</th>
              <th style={{ textAlign: 'left', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>Fiyat</th>
              <th style={{ textAlign: 'right', padding: '16px', color: 'var(--text-light)', fontWeight: '600' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-muted)' }}>
                 <td style={{ padding: '16px', fontWeight: '600' }}>{item.name}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 10px',
                    backgroundColor: 'var(--surface-soft)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>{item.category}</span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    color: item.stock < 5 ? 'var(--error)' : 'inherit',
                    fontWeight: item.stock < 5 ? '700' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {item.stock < 5 && <AlertTriangle size={14} />}
                    {item.stock}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-light)' }}>{item.unit}</td>
                <td style={{ padding: '16px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                  {item.price.toLocaleString('tr-TR')} TL
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleOpenModal(item)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-light)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-soft)'; e.currentTarget.style.color = 'var(--primary-mid)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-light)'; }}
                  >
                    <Edit2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            padding: '32px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-light)' }}>Ürün Adı</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-light)' }}>Kategori</label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-light)' }}>Birim</label>
                  <input 
                    type="text" 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="Adet, kg, kavanoz..."
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-light)' }}>Stok</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={(e) => setFormData({...formData, stock: parseFloat(e.target.value)})}
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-light)' }}>Fiyat (TL)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface)', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary-mid)', color: 'var(--on-primary)', fontWeight: '600', cursor: 'pointer' }}
                >
                  {editingProduct ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InventoryPanel;
