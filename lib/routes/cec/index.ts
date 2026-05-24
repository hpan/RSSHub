import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';

export const route: Route = {
    path: '/',
    categories: ['new-media'],
    example: '/cec',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新闻中心',
    maintainers: ['your-github-id'],
    description: `提供中国电力企业联合会最新新闻`,
    radar: [
        {
            source: ['www.cec.org.cn/'],
            target: '/',
        },
    ],
    handler,
};

const API_BASE = 'https://www.cec.org.cn/ms-mcms/mcms';

async function getNewsList(): Promise<{ title: string; link: string; id: string; type: string }[]> {
    const response = await ofetch(`${API_BASE}/index/list`);
    
    if (!response.success) {
        throw new Error('Failed to fetch news list');
    }
    
    const news: { title: string; link: string; id: string; type: string }[] = [];
    const data = response.data;
    
    const categories = [
        data.topNews[1],
        data.topNews[3],
    ];
    
    for (const category of categories) {
        if (category && category.list) {
            for (const item of category.list) {
                const type = item.newType || '3';
                const id = item.articleID;
                
                news.push({
                    title: item.basicTitle,
                    link: `https://www.cec.org.cn/detail/index.html?${type}-${id}`,
                    id: String(id),
                    type,
                });
            }
        }
    }
    
    return news;
}

async function getArticleDetail(id: string) {
    const response = await ofetch(`${API_BASE}/content/detail?id=${id}`);
    
    if (!response.success) {
        throw new Error('Failed to fetch article detail');
    }
    
    return response.data;
}

export async function handler() {
    const list = await getNewsList();
    
    const items = await Promise.all(
        list.slice(0, 20).map(async (item) => {
            const detail = await getArticleDetail(item.id);
            
            return {
                title: detail.basicTitle,
                link: item.link,
                description: detail.articleContent || '',
                pubDate: detail.publicTime ? new Date(detail.publicTime) : undefined,
                author: detail.articleAuthor,
                category: detail.categoryName,
            };
        })
    );
    
    return {
        title: '中国电力企业联合会',
        link: 'https://www.cec.org.cn/',
        item: items,
    };
}
