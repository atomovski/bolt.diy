import { useState, useEffect } from 'react';
import type { ServiceStatus } from './types';
import { ProviderStatusCheckerFactory } from './provider-factory';

export default function ServiceStatusTab() {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAllProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        const providers = ProviderStatusCheckerFactory.getProviderNames();
        const statuses: ServiceStatus[] = [];

        for (const provider of providers) {
          try {
            const checker = ProviderStatusCheckerFactory.getChecker(provider);
            const result = await checker.checkStatus();

            statuses.push({
              provider,
              ...result,
              lastChecked: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`Error checking ${provider} status:`, err);
            statuses.push({
              provider,
              status: 'degraded',
              message: 'Unable to check service status',
              incidents: ['Error checking service status'],
              lastChecked: new Date().toISOString(),
            });
          }
        }

        setServiceStatuses(statuses);
      } catch (err) {
        console.error('Error checking provider statuses:', err);
        setError('Failed to check service statuses');
      } finally {
        setLoading(false);
      }
    };

    checkAllProviders();

    // Set up periodic checks every 5 minutes
    const interval = setInterval(checkAllProviders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-500 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'down':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'i-ph:check-circle';
      case 'degraded':
        return 'i-ph:warning';
      case 'down':
        return 'i-ph:x-circle';
      default:
        return 'i-ph:question';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="i-ph:circle-notch h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-red-500 dark:text-red-400">
        <div className="i-ph:warning mb-2 h-8 w-8" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {serviceStatuses.map((service) => (
          <div
            key={service.provider}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.provider}</h3>
              <div className={`flex items-center ${getStatusColor(service.status)}`}>
                <div className={`${getStatusIcon(service.status)} mr-2 h-5 w-5`} />
                <span className="capitalize">{service.status}</span>
              </div>
            </div>
            <p className="mb-2 text-gray-600 dark:text-gray-300">{service.message}</p>
            {service.incidents && service.incidents.length > 0 && (
              <div className="mt-2">
                <h4 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Incidents:</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {service.incidents.map((incident, index) => (
                    <li key={index}>{incident}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Last checked: {new Date(service.lastChecked).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
