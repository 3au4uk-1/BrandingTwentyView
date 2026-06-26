import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'twenty-sdk/front-component';

import { DealsTable } from './DealsTable/DealsTable';

const queryClient = new QueryClient();

export const DealsBoard = () => {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
          color: colorScheme === 'dark' ? '#eee' : '#333',
        }}
      >
        <DealsTable colorScheme={colorScheme} />
      </div>
    </QueryClientProvider>
  );
};
