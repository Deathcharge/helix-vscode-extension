// React-based Marketplace for VSCode Web View
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// Mock data for demonstration
const mockProducts = [
  {
    id: 'agent-code-analyzer-pro',
    name: 'Code Analyzer Pro',
    description: 'Advanced static code analysis with AI-powered insights',
    category: 'agent',
    price: 29.99,
    rating: 4.8,
    downloads: 1542,
    capabilities: ['code-analysis', 'refactoring', 'documentation'],
    compatibility: ['typescript', 'javascript', 'python', 'rust'],
    thumbnail: '🔍',
    demoUrl: 'https://example.com/demo',
  },
  {
    id: 'test-suite-generator',
    name: 'Test Suite Generator',
    description:
      'Automatically generate comprehensive test suites for your code',
    category: 'agent',
    price: 19.99,
    rating: 4.6,
    downloads: 891,
    capabilities: ['test-generation', 'coverage-analysis', 'mock-generation'],
    compatibility: ['typescript', 'javascript', 'python', 'java'],
    thumbnail: '🧪',
    demoUrl: 'https://example.com/demo',
  },
  {
    id: 'security-audit-suite',
    name: 'Security Audit Suite',
    description: 'Complete security analysis and vulnerability detection',
    category: 'agent',
    price: 39.99,
    rating: 4.9,
    downloads: 654,
    capabilities: [
      'security-scanning',
      'vulnerability-detection',
      'best-practices',
    ],
    compatibility: ['all-languages'],
    thumbnail: '🔒',
    demoUrl: 'https://example.com/demo',
  },
  {
    id: 'performance-optimizer',
    name: 'Performance Optimizer',
    description: 'Optimize your code for better performance and efficiency',
    category: 'tool',
    price: 24.99,
    rating: 4.4,
    downloads: 1234,
    capabilities: ['performance-analysis', 'optimization', 'memory-usage'],
    compatibility: ['typescript', 'javascript', 'python', 'rust'],
    thumbnail: '⚡',
    demoUrl: 'https://example.com/demo',
  },
];

const ProductCard = ({ product, onInstall, onDemo }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      // Simulate installation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsInstalled(true);
      onInstall(product.id);
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #444',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: '#2d2d2d',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            minWidth: '40px',
            textAlign: 'center',
          }}
        >
          {product.thumbnail}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
              {product.name}
            </h3>
            <span
              style={{
                fontSize: '12px',
                backgroundColor: '#444',
                padding: '2px 8px',
                borderRadius: '4px',
                color: '#ccc',
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}
            >
              {product.category}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#aaa',
              lineHeight: '1.4',
            }}
          >
            {product.description}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {product.capabilities.map(capability => (
            <span
              key={capability}
              style={{
                fontSize: '10px',
                backgroundColor: '#333',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#ccc',
              }}
            >
              {capability}
            </span>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{ fontSize: '14px', fontWeight: 'bold', color: '#007acc' }}
          >
            ${product.price}
          </div>
          <div style={{ fontSize: '10px', color: '#888' }}>
            {product.rating} ★ ({product.downloads} downloads)
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleInstall}
          disabled={isInstalled || isInstalling}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: isInstalled
              ? '#28a745'
              : isInstalling
                ? '#666'
                : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isInstalled ? 'default' : 'pointer',
            opacity: isInstalled ? 0.8 : 1,
          }}
        >
          {isInstalling
            ? 'Installing...'
            : isInstalled
              ? 'Installed'
              : 'Install'}
        </button>
        <button
          onClick={() => onDemo(product.demoUrl)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Demo
        </button>
      </div>

      {isInstalled && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          INSTALLED
        </div>
      )}
    </div>
  );
};

const FilterBar = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = e => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: '#2d2d2d',
        borderRadius: '8px',
      }}
    >
      <div style={{ flex: 1 }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleSearch}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            style={{
              padding: '6px 12px',
              backgroundColor:
                selectedCategory === category ? '#007acc' : '#444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

const Marketplace = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulate loading products
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  const categories = ['all', 'agent', 'tool', 'integration', 'template'];

  const filteredProducts = products.filter(product => {
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInstall = productId => {
    window.vscode.postMessage({
      command: 'installProduct',
      productId: productId,
    });
  };

  const handleDemo = demoUrl => {
    window.vscode.postMessage({
      command: 'openDemo',
      url: demoUrl,
    });
  };

  const handleCategoryChange = category => {
    setSelectedCategory(category);
  };

  const handleSearch = term => {
    setSearchTerm(term);
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        minHeight: '100vh',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>Marketplace</h1>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() =>
              window.vscode.postMessage({ command: 'refreshMarketplace' })
            }
            style={{
              padding: '8px 16px',
              backgroundColor: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
          <button
            onClick={() =>
              window.vscode.postMessage({ command: 'checkUpdates' })
            }
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Check Updates
          </button>
        </div>
      </div>

      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
      />

      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: '#888',
          }}
        >
          Loading marketplace...
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#2d2d2d',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', color: '#888' }}>
              Found {filteredProducts.length} products
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#888',
                padding: '40px',
              }}
            >
              No products found. Try adjusting your search or filters.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onInstall={handleInstall}
                  onDemo={handleDemo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Initialize React
ReactDOM.render(<Marketplace />, document.getElementById('root'));
