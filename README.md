# BiteDash Frontend

A modern, responsive React frontend application for BiteDash, a food delivery platform for the Kenyan market. Built with React 18, TypeScript, and Tailwind CSS.

## 🚀 Features

### Customer Features
- Browse restaurants with filtering and search
- View restaurant menus with item details
- Shopping cart with quantity management
- Place orders with delivery address
- M-Pesa payment integration
- Order tracking with real-time status updates
- Order history and details

### Restaurant Owner Features
- Restaurant dashboard with statistics
- Menu management (CRUD operations)
- Order management and status updates
- Toggle restaurant open/closed status
- View pending orders

### Rider Features
- View available orders
- Accept orders for delivery
- Track delivery status
- Delivery history

### Admin Features
- System dashboard
- User management
- Restaurant management
- Order management

## 🛠️ Tech Stack

- **React 18+** with TypeScript
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **UI Framework**: Tailwind CSS + Headless UI
- **Form Handling**: React Hook Form + Zod validation
- **Notifications**: Sonner
- **Date/Time**: date-fns
- **Icons**: Lucide React

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```env
   VITE_API_BASE_URL=http://bitedash-api.test/api/v1
   VITE_APP_NAME=BiteDash
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── api/                 # API service functions
│   ├── client.ts       # Axios instance with interceptors
│   ├── auth.ts         # Authentication API
│   ├── restaurants.ts  # Restaurant API
│   ├── menuItems.ts    # Menu items API
│   ├── orders.ts       # Orders API
│   └── payments.ts     # Payments API
├── components/         # Reusable components
│   ├── auth/          # Authentication components
│   ├── restaurants/   # Restaurant components
│   ├── menu/          # Menu components
│   ├── orders/        # Order components
│   ├── payments/      # Payment components
│   ├── layout/        # Layout components
│   └── common/        # Common UI components
├── pages/             # Page components
│   ├── Auth/          # Login, Register
│   ├── Customer/      # Customer pages
│   ├── Restaurant/    # Restaurant owner pages
│   ├── Rider/         # Rider pages
│   └── Admin/         # Admin pages
├── store/             # Zustand stores
│   ├── authStore.ts   # Authentication state
│   ├── cartStore.ts   # Shopping cart state
│   └── orderStore.ts  # Order state
├── types/             # TypeScript type definitions
│   ├── auth.types.ts
│   ├── restaurant.types.ts
│   ├── order.types.ts
│   └── payment.types.ts
├── utils/             # Utility functions
│   ├── constants.ts   # App constants
│   ├── formatters.ts  # Formatting functions
│   ├── validators.ts  # Zod schemas
│   └── cn.ts          # Class name utility
└── App.tsx            # Main app component with routing
```

## 🔐 Authentication

The app uses Bearer token authentication (Sanctum). Tokens are stored in localStorage and automatically included in API requests via Axios interceptors.

### User Roles
- **Customer**: Browse, order, and pay
- **Restaurant**: Manage restaurant and orders
- **Rider**: Accept and deliver orders
- **Admin**: Full system access

## 🎨 UI Components

### Common Components
- `Button` - Styled button with variants
- `Input` - Form input with validation
- `Card` - Container card component
- `Badge` - Status badges
- `Modal` - Dialog modal
- `Spinner` - Loading spinner

### Layout Components
- `Navbar` - Navigation bar with role-based links
- `Layout` - Main layout wrapper
- `ProtectedRoute` - Route guard component

## 📡 API Integration

All API calls are made through service functions in the `api/` directory. The Axios client is configured with:
- Base URL from environment variables
- Automatic token injection
- Error handling and interceptors
- Request/response transformation

## 🔄 State Management

### Auth Store
- User authentication state
- Login/logout functions
- Token management
- Role-based access

### Cart Store
- Shopping cart items
- Quantity management
- Restaurant association
- Total calculation

### Order Store
- Order list and details
- Order creation and updates
- Status management

## 📝 Form Validation

All forms use React Hook Form with Zod validation schemas:
- Registration form with phone number validation
- Login form
- Order form
- Payment form
- Menu item forms

## 🎯 Key Features

### Kenyan Market Specifics
- Phone number format: +254XXXXXXXXX
- Currency: KES (Kenyan Shillings)
- M-Pesa payment integration
- Local address formats

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (1024px), lg (1280px)
- Touch-friendly interactions

### Error Handling
- Network error handling
- Validation error display
- Authentication error redirects
- User-friendly error messages

### Loading States
- Spinner components
- Button loading states
- Skeleton loaders (where applicable)

## 🧪 Testing

To run tests (when implemented):
```bash
npm test
```

## 🚢 Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains the production build.

3. Deploy to your hosting service (Vercel, Netlify, etc.)

## 📄 License

This project is part of the BiteDash platform.

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Follow the component patterns established
4. Add proper error handling
5. Include loading states

## 📞 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for the Kenyan market**
