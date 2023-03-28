import {
  createBrowserRouter,
  redirect
} from 'react-router-dom';
import translationRoutes from '../features/translation/router';
import languagesRoutes from '../features/languages/router';
import Layout from './Layout';
import NotFound from './NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        loader() {
          return redirect('/translation')
        }
      },
      ...translationRoutes,
      ...languagesRoutes
    ]
  }
])

export default router;