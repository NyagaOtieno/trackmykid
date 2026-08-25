import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getConfig, setConfig } from '@/lib/config';

export default function Settings() {
  const [useMockData, setUseMockData] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState('https://schooltransport-production.up.railway.app/api');

  useEffect(() => {
    const config = getConfig();
    setUseMockData(config.useMockData);
    setApiBaseUrl(config.apiBaseUrl);
  }, []);

  const handleSave = () => {
    setConfig(useMockData, apiBaseUrl);
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure your application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
            <CardDescription>
              Switch between mock data and live API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mock-data">Use Mock Data</Label>
                <p className="text-sm text-muted-foreground">
                  Enable to use local mock data instead of live API
                </p>
              </div>
              <Switch
                id="mock-data"
                checked={useMockData}
                onCheckedChange={setUseMockData}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Set your backend API endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API Base URL</Label>
              <Input
                id="api-url"
                type="url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
              <p className="text-xs text-muted-foreground">
                This will be used when Mock Data is disabled
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Info</CardTitle>
            <CardDescription>
              System information and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm text-muted-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm font-medium">Current Mode</span>
              <span className={`text-sm font-medium ${useMockData ? 'text-warning' : 'text-success'}`}>
                {useMockData ? 'Mock Data' : 'Live API'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium">Status</span>
              <span className="text-sm text-success">● Active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Clear Cache
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Export Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              View Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
