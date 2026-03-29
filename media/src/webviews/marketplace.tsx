import React, { useState, useEffect } from 'react';
// Mock service for webview
const apiService = {
  browseProducts: async () => ({ success: true, data: [] }),
  getProduct: async () => ({ success: true, data: null }),
};

interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  category: 'agent' | 'tool' | 'integration' | 'template';
  price: number;
  rating: number;
  downloads: number;
  capabilities: string[];
  compatibility: string[];
  thumbnail?: string;
  demoUrl?: string;
}

const Marketplace: React.FC = () => {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedProducts, setInstalledProducts] = useState<Set<string>>(
    new Set()
  );
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  const apiService = new ApiService();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.browseProducts(
        selectedCategory === 'all' ? undefined : selectedCategory
      );

      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        setError(response.message || 'Failed to fetch products');
      }
    } catch (err) {
      setError('Failed to connect to Helix API');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (productId: string) => {
    try {
      setInstalling(prev => new Set([...prev, productId]));
      const response = await apiService.installProduct(productId);

      if (response.success) {
        setInstalledProducts(prev => new Set([...prev, productId]));
        showNotification(
          `Successfully installed ${products.find(p => p.id === productId)
            ?.name}`
        );
      } else {
        throw new Error(response.message || 'Installation failed');
      }
    } catch (err) {
      setError(`Failed to install product: ${err}`);
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleUninstall = async (productId: string) => {
    try {
      const response = await apiService.uninstallProduct(productId);

      if (response.success) {
        setInstalledProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        showNotification(
          `Successfully uninstalled ${products.find(p => p.id === productId)
            ?.name}`
        );
      } else {
        throw new Error(response.message || 'Uninstallation failed');
      }
    } catch (err) {
      setError(`Failed to uninstall product: ${err}`);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getRatingStars = (rating: number): string => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    return (
      '★'.repeat(fullStars) +
      (hasHalfStar ? '½' : '') +
      '☆'.repeat(5 - Math.ceil(rating))
    );
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'agent':
        return '#58a6ff';
      case 'tool':
        return '#3fb950';
      case 'integration':
        return '#d29922';
      case 'template':
        return '#f85149';
      default:
        return '#8b949e';
    }
  };

  const showNotification = (message: string) => {
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      vscode.postMessage({
        command: 'showNotification',
        text: message,
      });
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>🏪 Helix Marketplace</h1>
          <div className="status-bar">
            <span className="status-item">Status: Loading products...</span>
          </div>
        </div>
        <div className="loading">Loading marketplace products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>🏪 Helix Marketplace</h1>
        </div>
        <div className="error">
          <strong>Error:</strong> {error}
          <br />
          <button
            className="btn"
            onClick={fetchProducts}
            style={{ marginTop: '10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🏪 Helix Marketplace</h1>
        <div className="status-bar">
          <span className="status-item">Total Products: {products.length}</span>
          <span className="status-item">
            Installed: {installedProducts.size}
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#8b949e' }}>
              Category:
            </span>
            {['all', 'agent', 'tool', 'integration', 'template'].map(
              category => (
                <button
                  key={category}
                  className={`btn ${
                    selectedCategory === category ? '' : 'btn-secondary'
                  }`}
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    backgroundColor:
                      selectedCategory === category
                        ? getCategoryColor(category)
                        : undefined,
                  }}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              )
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn" onClick={fetchProducts}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>
                    {product.category === 'agent'
                      ? '🤖'
                      : product.category === 'tool'
                        ? '🛠️'
                        : product.category === 'integration'
                          ? '🔗'
                          : '📋'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {product.name}
                    </div>
                    <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                      <span
                        className="tag"
                        style={{
                          backgroundColor: getCategoryColor(product.category),
                          color: 'white',
                        }}
                      >
                        {product.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: '#8b949e',
                    marginBottom: '10px',
                  }}
                >
                  {product.description}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: '#58a6ff',
                  }}
                >
                  ${product.price}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                  {product.downloads} downloads
                </div>
              </div>
            </div>

            {/* Ratings and Stats */}
            <div
              style={{
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#21262d',
                borderRadius: '6px',
                border: '1px solid #30363d',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '5px',
                }}
              >
                <span style={{ fontSize: '0.9rem', color: '#8b949e' }}>
                  Rating
                </span>
                <span style={{ fontSize: '0.9rem', color: '#f85149' }}>
                  {getRatingStars(product.rating)}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                {product.rating.toFixed(1)}/5.0 • {product.downloads} downloads
              </div>
            </div>

            {/* Capabilities */}
            <div style={{ marginBottom: '15px' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginBottom: '5px',
                }}
              >
                Capabilities:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {product.capabilities.slice(0, 4).map(capability => (
                  <span key={capability} className="tag">
                    {capability}
                  </span>
                ))}
                {product.capabilities.length > 4 && (
                  <span className="tag">
                    +{product.capabilities.length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* Compatibility */}
            <div style={{ marginBottom: '15px' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginBottom: '5px',
                }}
              >
                Compatible with:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {product.compatibility.map(lang => (
                  <span
                    key={lang}
                    className="tag"
                    style={{ backgroundColor: '#30363d' }}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {installedProducts.has(product.id) ? (
                <button
                  className="btn btn-danger"
                  onClick={() => handleUninstall(product.id)}
                  style={{ flex: 1 }}
                >
                  Uninstall
                </button>
              ) : (
                <button
                  className="btn"
                  onClick={() => handleInstall(product.id)}
                  disabled={installing.has(product.id)}
                  style={{ flex: 1 }}
                >
                  {installing.has(product.id)
                    ? 'Installing...'
                    : `Install - $${product.price}`}
                </button>
              )}

              {product.demoUrl && (
                <button
                  className="btn btn-secondary"
                  onClick={() => window.open(product.demoUrl, '_blank')}
                  style={{ flex: 1 }}
                >
                  Demo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#8b949e' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🏪</div>
          No products found matching your criteria.
          <br />
          <span style={{ fontSize: '0.9rem' }}>
            Try adjusting your search or category filter.
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={fetchProducts}>
            Refresh Products
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </button>
          <button
            className="btn"
            onClick={() => {
              const installed = products.filter(p =>
                installedProducts.has(p.id)
              );
              if (installed.length === 0) {
                showNotification('No products installed yet.');
              } else {
                showNotification(
                  `You have ${installed.length} products installed.`
                );
              }
            }}
          >
            Check Installed
          </button>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
