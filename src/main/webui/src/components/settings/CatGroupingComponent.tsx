import {BoardComponent} from "@/components/dndComponent/BoardComponent.tsx";

function CatGroupingComponent() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Category Grouping</h2>
                <p className="text-muted-foreground">
                    Organize your transaction categories into groups.
                </p>
            </div>
            <div className="h-full">
                <BoardComponent/>
            </div>
        </div>
    );
}

export default CatGroupingComponent;
