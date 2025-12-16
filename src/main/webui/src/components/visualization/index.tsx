import BarChartComponent from "@/components/visualization/BarChartComponent.tsx";
import { MerchantAnalytics } from "@/components/visualization/MerchantAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Visualization = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    Deep dive into your spending habits and merchant trends.
                </p>
            </div>

            <Tabs defaultValue="expenses" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
                    <TabsTrigger value="merchants">Merchant Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense Overview</CardTitle>
                            <CardDescription>
                                Breakdown of your expenses over time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <BarChartComponent />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="merchants" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Merchant Insights</CardTitle>
                            <CardDescription>
                                Top merchants and spending frequency.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MerchantAnalytics />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Visualization;
